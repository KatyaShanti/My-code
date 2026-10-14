#!/usr/bin/env python3
"""Ищет в клиентских текстах бота фразы, которые выдают бота.

Использование:
    humanity_lint.py <файл или папка> [...]   проверить файлы (.txt .md .json .py .js .ts .yaml)
    echo "текст" | humanity_lint.py -          проверить stdin
    humanity_lint.py --self-test               проверить сам линтер

Код выхода 1, если есть находки уровня «критично».
"""
import re
import sys
from pathlib import Path

CRIT = "критично"
WARN = "важно"

# (уровень, регулярка, подсказка). Регулярки без учёта регистра.
RULES = [
    (CRIT, r"\b(я|это)\s+(бот|ии|нейросеть|автоответчик|языковая модель|виртуальн\w+ помощни\w+)\b", "раскрытие: бот называет себя"),
    (CRIT, r"\bкак (ии|искусственный интеллект|языковая модель)\b", "раскрытие: «как ИИ»"),
    (CRIT, r"\b(chatgpt|gpt-?\d|openai|claude|anthropic)\b", "раскрытие: название модели"),
    (CRIT, r"\bбаз\w* знаний\b", "служебное слово: база знаний"),
    (CRIT, r"\bпромпт\w*\b", "служебное слово: промпт"),
    (CRIT, r"\bобработал\w* (ваш |твой )?запрос\w*\b", "служебная фраза"),
    (CRIT, r"\bне (смогла|смог|удалось) (определить|распознать|обработать)\b", "служебная фраза"),
    (CRIT, r"\b(уточню|спрошу) у кати\b|\bпередам (кате|администратор\w*|менеджер\w*)\b", "раскрытие механики: бот и есть Катя"),
    (CRIT, r"\b(ошибка|error|exception|traceback)\b", "техническая ошибка в тексте клиенту"),
    (WARN, r"надеюсь,? (это )?было полезно", "шаблонная концовка"),
    (WARN, r"если (у вас )?возникнут (ещё )?вопросы", "шаблонная концовка"),
    (WARN, r"обращайтесь", "шаблонная концовка"),
    (WARN, r"^\s*конечно!", "шаблонное начало «Конечно!»"),
    (WARN, r"отличный вопрос", "шаблон «Отличный вопрос»"),
    (WARN, r"рада помочь", "шаблон «Рада помочь»"),
    (WARN, r"во-первых", "структура «во-первых… во-вторых»"),
    (WARN, r"\b(данн(ый|ая|ое|ые|ого|ом)|в рамках|осуществ\w+)\b", "канцелярит"),
    (WARN, r"—[^—\n]{0,60}—", "цепочка длинных тире"),
    (WARN, r"^\s*(#{1,6}\s|\d+\.\s|[-*•]\s)|\*\*[^*]+\*\*", "разметка: заголовок, список или жирный"),
    (WARN, r"(?:[\U0001F300-\U0001FAFF☀-➿]\s*){3,}", "гирлянда эмодзи"),
]

COMPILED = [(lvl, re.compile(rx, re.IGNORECASE | re.MULTILINE), hint) for lvl, rx, hint in RULES]
EXTS = {".txt", ".md", ".json", ".py", ".js", ".ts", ".yaml", ".yml"}


def lint_text(text):
    out = []
    for lvl, rx, hint in COMPILED:
        for m in rx.finditer(text):
            line = text.count("\n", 0, m.start()) + 1
            out.append((lvl, line, m.group(0).strip(), hint))
    return out


def iter_files(paths):
    for p in map(Path, paths):
        if p.is_dir():
            yield from (f for f in sorted(p.rglob("*")) if f.suffix in EXTS and f.is_file())
        elif p.is_file():
            yield p


def self_test():
    bad = [
        "Я бот, но постараюсь помочь",
        "Как ИИ, я не могу",
        "Сейчас уточню у Кати и вернусь",
        "Не смогла определить ник",
        "Посмотрю в базе знаний",
        "Это ChatGPT отвечает",
    ]
    good = [
        "Ха, почему? 😊 Слишком быстро отвечаю?",
        "Секунду, сейчас гляну",
        "Маша, ты молодец, что сделала первый шаг 🤍",
    ]
    ok = True
    for t in bad:
        if not any(l == CRIT for l, *_ in lint_text(t)):
            print("НЕ ПОЙМАЛ:", t); ok = False
    for t in good:
        if lint_text(t):
            print("ЛОЖНАЯ ТРЕВОГА:", t, lint_text(t)); ok = False
    print("self-test:", "ok" if ok else "FAIL")
    return 0 if ok else 1


def main(argv):
    if not argv:
        print(__doc__); return 2
    if argv == ["--self-test"]:
        return self_test()
    findings = []
    if argv == ["-"]:
        findings = [("stdin", *f) for f in lint_text(sys.stdin.read())]
    else:
        for f in iter_files(argv):
            findings += [(str(f), *x) for x in lint_text(f.read_text(encoding="utf-8", errors="ignore"))]
    for src, lvl, line, frag, hint in findings:
        print(f"{src}:{line}: [{lvl}] {hint}: «{frag}»")
    crit = sum(1 for _, lvl, *_ in findings if lvl == CRIT)
    print(f"итого: {len(findings)} находок, критичных {crit}")
    return 1 if crit else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
