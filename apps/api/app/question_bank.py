from __future__ import annotations

import json
from math import gcd
from dataclasses import dataclass


@dataclass(frozen=True)
class QuestionSeed:
    id: str
    lesson_id: str
    prompt: str
    exercise_type: str
    difficulty: int
    correct_answer: str
    explanation: str
    options_json: str
    hints_json: str
    estimated_seconds: int
    skill: str


QUESTION_BANK_PATHS = [
    ("path-001", "Mundo das Fracoes", "Fracoes", "6o ao 8o ano", "iniciante", "Ilhas das Partes", 76),
    ("path-002", "Liga da Algebra", "Algebra", "8o ano ao 3o EM", "intermediario", "Cidade das Equacoes", 48),
    ("path-004", "Oficina da Aritmetica", "Aritmetica", "6o ao 9o ano", "iniciante", "Patio dos Numeros", 58),
    ("path-005", "Central da Porcentagem", "Porcentagem", "7o ano ao 1o EM", "intermediario", "Rua dos Numeros", 44),
]

QUESTION_BANK_LESSONS = [
    ("lesson-001", "path-001", "Fracoes equivalentes", "Treine equivalencia de fracoes em formato direto.", 7, 1, 35),
    ("lesson-002", "path-001", "Soma de fracoes", "Some fracoes com foco em calculo puro.", 8, 2, 40),
    ("lesson-016", "path-001", "Comparacao de fracoes", "Compare fracoes de modo direto.", 7, 3, 35),
    ("lesson-017", "path-001", "Simplificacao de fracoes", "Simplifique fracoes sem contexto textual.", 7, 4, 38),
    ("lesson-003", "path-002", "Equacoes simples", "Resolva equacoes lineares curtas.", 9, 1, 45),
    ("lesson-018", "path-002", "Equacoes com dois passos", "Isole a incognita em duas etapas.", 10, 2, 50),
    ("lesson-014", "path-002", "Potenciacao", "Treine potencias inteiras e propriedades basicas.", 8, 3, 42),
    ("lesson-015", "path-002", "Radiciacao", "Treine raizes exatas de forma objetiva.", 8, 4, 42),
    ("lesson-019", "path-002", "Expressoes com potencia", "Resolva expressoes numericas com potencias.", 9, 5, 48),
    ("lesson-020", "path-002", "Notacao cientifica", "Treine leitura e escrita em notacao cientifica.", 9, 6, 48),
    ("lesson-005", "path-004", "Soma objetiva", "Resolva somas diretas e rapidas.", 6, 1, 24),
    ("lesson-006", "path-004", "Subtracao objetiva", "Pratique subtracoes sem enunciado contextual.", 6, 2, 24),
    ("lesson-007", "path-004", "Multiplicacao objetiva", "Ganhe velocidade na tabuada e nos produtos.", 7, 3, 28),
    ("lesson-008", "path-004", "Divisao objetiva", "Treine quocientes inteiros e diretos.", 7, 4, 28),
    ("lesson-009", "path-005", "Porcentagem direta", "Calcule porcentagens literais.", 8, 1, 34),
    ("lesson-010", "path-005", "Aumento e desconto", "Aplique taxa percentual sem texto longo.", 8, 2, 36),
]

LESSON_MIN_GRADE_BAND = {
    "lesson-001": "6o ano",
    "lesson-002": "6o ano",
    "lesson-016": "6o ano",
    "lesson-017": "6o ano",
    "lesson-005": "6o ano",
    "lesson-006": "6o ano",
    "lesson-007": "6o ano",
    "lesson-008": "6o ano",
    "lesson-009": "7o ano",
    "lesson-003": "8o ano",
    "lesson-010": "8o ano",
    "lesson-014": "8o ano",
    "lesson-015": "9o ano",
    "lesson-018": "9o ano",
    "lesson-019": "1o EM",
    "lesson-020": "1o EM",
}


def _options(correct: str, distractors: list[str]) -> str:
    labels = [correct, *distractors]
    return json.dumps(
        [{"id": chr(97 + index), "label": label, "value": label} for index, label in enumerate(labels)],
        ensure_ascii=True,
    )


def _hint(value: str) -> str:
    return json.dumps([value], ensure_ascii=True)


def _mc(
    identifier: str,
    lesson_id: str,
    prompt: str,
    difficulty: int,
    answer: str,
    distractors: list[str],
    explanation: str,
    hint: str,
    skill: str,
    estimated_seconds: int,
) -> QuestionSeed:
    return QuestionSeed(
        id=identifier,
        lesson_id=lesson_id,
        prompt=prompt,
        exercise_type="multiple_choice",
        difficulty=difficulty,
        correct_answer=answer,
        explanation=explanation,
        options_json=_options(answer, distractors),
        hints_json=_hint(hint),
        estimated_seconds=estimated_seconds,
        skill=skill,
    )


def _input(
    identifier: str,
    lesson_id: str,
    prompt: str,
    difficulty: int,
    answer: str,
    explanation: str,
    hint: str,
    skill: str,
    estimated_seconds: int,
) -> QuestionSeed:
    return QuestionSeed(
        id=identifier,
        lesson_id=lesson_id,
        prompt=prompt,
        exercise_type="input",
        difficulty=difficulty,
        correct_answer=answer,
        explanation=explanation,
        options_json="[]",
        hints_json=_hint(hint),
        estimated_seconds=estimated_seconds,
        skill=skill,
    )


def _difficulty_by_index(index: int, low_cut: int, mid_cut: int) -> int:
    if index <= low_cut:
        return 1
    if index <= mid_cut:
        return 2
    return 3


def _sum_questions() -> list[QuestionSeed]:
    questions: list[QuestionSeed] = []
    for index in range(1, 91):
        if index <= 30:
            a = 8 + index
            b = 6 + (index * 2)
        elif index <= 60:
            a = 55 + index
            b = 18 + (index * 3)
        else:
            a = 120 + (index * 4)
            b = 35 + (index * 5)
        answer = str(a + b)
        questions.append(
            _mc(
                f"qb-soma-{index:03d}",
                "lesson-005",
                f"Quanto e {a} + {b}?",
                _difficulty_by_index(index, 30, 60),
                answer,
                [str(a + b - 1), str(a + b + 2), str(a + b + 5)],
                f"Some {a} com {b}. O resultado e {answer}.",
                "Some diretamente os dois numeros.",
                "soma",
                18 if index <= 30 else 22,
            )
        )
    return questions


def _subtraction_questions() -> list[QuestionSeed]:
    questions: list[QuestionSeed] = []
    for index in range(1, 91):
        if index <= 30:
            minuend = 40 + (index * 3)
            subtrahend = 6 + index
        elif index <= 60:
            minuend = 180 + (index * 4)
            subtrahend = 45 + (index * 2)
        else:
            minuend = 420 + (index * 5)
            subtrahend = 120 + (index * 3)
        answer = str(minuend - subtrahend)
        questions.append(
            _mc(
                f"qb-subtracao-{index:03d}",
                "lesson-006",
                f"Quanto e {minuend} - {subtrahend}?",
                _difficulty_by_index(index, 30, 60),
                answer,
                [str(int(answer) + 1), str(int(answer) - 2), str(int(answer) + 4)],
                f"Retire {subtrahend} de {minuend}. O resultado e {answer}.",
                "Calcule a diferenca entre os dois numeros.",
                "subtracao",
                18 if index <= 30 else 22,
            )
        )
    return questions


def _multiplication_questions() -> list[QuestionSeed]:
    questions: list[QuestionSeed] = []
    for index in range(1, 101):
        if index <= 35:
            a = 2 + (index % 8)
            b = 3 + ((index * 2) % 7)
        elif index <= 70:
            a = 8 + (index % 9)
            b = 6 + ((index * 3) % 8)
        else:
            a = 12 + (index % 10)
            b = 9 + ((index * 4) % 9)
        answer = str(a * b)
        difficulty = 2 if index <= 35 else 3 if index <= 70 else 4
        questions.append(
            _mc(
                f"qb-multiplicacao-{index:03d}",
                "lesson-007",
                f"Quanto e {a} x {b}?",
                difficulty,
                answer,
                [str((a * b) + 2), str(max(1, (a * b) - 3)), str((a * b) + 6)],
                f"Multiplique {a} por {b}. O resultado e {answer}.",
                "Use a tabuada ou decomponha os fatores.",
                "multiplicacao",
                20 if difficulty == 2 else 24,
            )
        )
    return questions


def _division_questions() -> list[QuestionSeed]:
    questions: list[QuestionSeed] = []
    for index in range(1, 101):
        if index <= 35:
            divisor = 2 + (index % 8)
            quotient = 4 + index
        elif index <= 70:
            divisor = 7 + (index % 8)
            quotient = 12 + index
        else:
            divisor = 9 + (index % 10)
            quotient = 25 + index
        dividend = divisor * quotient
        answer = str(quotient)
        difficulty = 2 if index <= 35 else 3 if index <= 70 else 4
        questions.append(
            _mc(
                f"qb-divisao-{index:03d}",
                "lesson-008",
                f"Quanto e {dividend} / {divisor}?",
                difficulty,
                answer,
                [str(quotient + 1), str(quotient - 1), str(quotient + 2)],
                f"Divida {dividend} por {divisor}. O quociente e {answer}.",
                "Pense em qual numero multiplicado pelo divisor gera o dividendo.",
                "divisao",
                20 if difficulty == 2 else 24,
            )
        )
    return questions


def _fraction_equivalent_questions() -> list[QuestionSeed]:
    questions: list[QuestionSeed] = []
    bases = [(1, 2), (2, 3), (3, 4), (2, 5), (3, 5), (4, 7), (5, 8), (3, 8), (5, 6), (7, 9), (4, 9), (5, 12)]
    for index in range(1, 61):
        numerator, denominator = bases[(index - 1) % len(bases)]
        factor = 2 + ((index - 1) % 5)
        answer = f"{numerator * factor}/{denominator * factor}"
        questions.append(
            _mc(
                f"qb-frac-equivalente-{index:03d}",
                "lesson-001",
                f"Qual e uma fracao equivalente a {numerator}/{denominator}?",
                2 if index <= 30 else 3,
                answer,
                [
                    f"{numerator + factor}/{denominator + factor}",
                    f"{numerator * factor}/{denominator + factor}",
                    f"{numerator + 1}/{denominator * factor}",
                ],
                f"Multiplique numerador e denominador por {factor}. Assim voce obtem {answer}.",
                "Multiplique os dois termos pelo mesmo numero.",
                "fracoes equivalentes",
                24,
            )
        )
    return questions


def _fraction_sum_questions() -> list[QuestionSeed]:
    questions: list[QuestionSeed] = []
    for index in range(1, 61):
        if index <= 20:
            a_den = 4 + (index % 6)
            b_den = a_den
        elif index <= 40:
            a_den = 3 + (index % 5)
            b_den = a_den * 2
        else:
            a_den = 4 + (index % 7)
            b_den = 6 + (index % 8)
        a_num = 1 + (index % max(2, a_den - 1))
        b_num = 1 + ((index * 2) % max(2, b_den - 1))
        common = a_den * b_den
        answer_num = (a_num * b_den) + (b_num * a_den)
        divisor = gcd(answer_num, common)
        answer = f"{answer_num // divisor}/{common // divisor}"
        difficulty = 2 if index <= 20 else 3 if index <= 40 else 4
        questions.append(
            _input(
                f"qb-frac-soma-{index:03d}",
                "lesson-002",
                f"Quanto e {a_num}/{a_den} + {b_num}/{b_den}?",
                difficulty,
                answer,
                f"Escreva as fracoes com o mesmo denominador e some os numeradores. O resultado e {answer}.",
                "Use um denominador comum antes de somar.",
                "soma de fracoes",
                28 if difficulty < 4 else 32,
            )
        )
    return questions


def _fraction_compare_questions() -> list[QuestionSeed]:
    questions: list[QuestionSeed] = []
    for index in range(1, 61):
        if index <= 30:
            den = 4 + (index % 9)
            left_num = 1 + (index % max(2, den - 1))
            right_num = left_num + 1
            if right_num >= den:
                right_num = den - 1
                left_num = max(1, right_num - 1)
            left = f"{left_num}/{den}"
            right = f"{right_num}/{den}"
            answer = right
        else:
            den = 6 + (index % 8)
            left_num = 2 + (index % max(3, den - 2))
            right_num = max(1, left_num - 1)
            left = f"{left_num}/{den}"
            right = f"{right_num}/{den}"
            answer = left
        questions.append(
            _mc(
                f"qb-frac-comparacao-{index:03d}",
                "lesson-016",
                f"Qual fracao e maior: {left} ou {right}?",
                2 if index <= 30 else 3,
                answer,
                [left if answer != left else right, "sao iguais", "nenhuma"],
                f"Compare os numeradores porque os denominadores sao iguais. A maior e {answer}.",
                "Quando o denominador e igual, compare o numerador.",
                "comparacao de fracoes",
                22,
            )
        )
    return questions


def _fraction_simplification_questions() -> list[QuestionSeed]:
    questions: list[QuestionSeed] = []
    for index in range(1, 61):
        divisor = 2 + (index % 8)
        base_num = 2 + (index % 9)
        base_den = base_num + 1 + (index % 5)
        raw_num = base_num * divisor
        raw_den = base_den * divisor
        answer = f"{base_num}/{base_den}"
        questions.append(
            _input(
                f"qb-frac-simplificacao-{index:03d}",
                "lesson-017",
                f"Simplifique {raw_num}/{raw_den}.",
                2 if index <= 30 else 3,
                answer,
                f"Divida numerador e denominador pelo MDC. A forma simplificada e {answer}.",
                "Procure um divisor comum entre numerador e denominador.",
                "simplificacao de fracoes",
                24,
            )
        )
    return questions


def _percentage_questions() -> list[QuestionSeed]:
    questions: list[QuestionSeed] = []
    for index in range(1, 81):
        if index <= 30:
            base = 20 + (index * 5)
            percent = [10, 20, 25, 50][(index - 1) % 4]
            difficulty = 2
        elif index <= 55:
            base = 90 + (index * 6)
            percent = [5, 15, 30, 40][(index - 1) % 4]
            difficulty = 3
        else:
            base = 180 + (index * 7)
            percent = [12, 18, 35, 45][(index - 1) % 4]
            difficulty = 4
        answer = str(int(base * percent / 100))
        questions.append(
            _input(
                f"qb-porcentagem-{index:03d}",
                "lesson-009",
                f"Quanto e {percent}% de {base}?",
                difficulty,
                answer,
                f"Calcule {percent}/100 de {base}. O resultado e {answer}.",
                "Transforme a porcentagem em fracao ou decimal.",
                "porcentagem",
                24 if difficulty == 2 else 28,
            )
        )
    return questions


def _percentage_transform_questions() -> list[QuestionSeed]:
    questions: list[QuestionSeed] = []
    for index in range(1, 81):
        base = 50 + (index * 5)
        percent = [10, 15, 20, 25, 30, 40][(index - 1) % 6]
        increase = index % 2 == 0
        factor = 100 + percent if increase else 100 - percent
        answer = str(int(base * factor / 100))
        verb = "aumenta" if increase else "reduz"
        skill = "aumento percentual" if increase else "desconto percentual"
        difficulty = 3 if index <= 40 else 4
        questions.append(
            _mc(
                f"qb-percentual-transformacao-{index:03d}",
                "lesson-010",
                f"Se {base} {verb} {percent}%, qual e o novo valor?",
                difficulty,
                answer,
                [str(base), str(int(answer) + 5), str(max(1, int(answer) - 5))],
                f"Aplique a taxa percentual diretamente sobre {base}. O novo valor e {answer}.",
                "Encontre a variacao e ajuste o valor inicial.",
                skill,
                28,
            )
        )
    return questions


def _equation_questions() -> list[QuestionSeed]:
    questions: list[QuestionSeed] = []
    for index in range(1, 81):
        x_value = 2 + index
        coefficient = 2 + (index % 5)
        right_side = coefficient * x_value
        difficulty = 2 if index <= 25 else 3 if index <= 55 else 4
        if index <= 25:
            prompt = f"Resolva: {coefficient}x = {right_side}"
            explanation = f"Divida os dois lados por {coefficient}. Assim, x = {x_value}."
        elif index <= 55:
            constant = 3 + (index % 7)
            right_side += constant
            prompt = f"Resolva: {coefficient}x + {constant} = {right_side}"
            explanation = f"Subtraia {constant} dos dois lados e depois divida por {coefficient}. Assim, x = {x_value}."
        else:
            constant = 4 + (index % 9)
            right_side -= constant
            prompt = f"Resolva: {coefficient}x - {constant} = {right_side}"
            explanation = f"Some {constant} aos dois lados e depois divida por {coefficient}. Assim, x = {x_value}."
        questions.append(
            _input(
                f"qb-equacao-{index:03d}",
                "lesson-003",
                prompt,
                difficulty,
                str(x_value),
                explanation,
                "Isole o x em etapas.",
                "equacoes",
                28 if difficulty <= 3 else 34,
            )
        )
    return questions


def _equation_two_step_questions() -> list[QuestionSeed]:
    questions: list[QuestionSeed] = []
    for index in range(1, 61):
        x_value = 3 + index
        multiplier = 2 + (index % 4)
        inner_constant = 1 + (index % 6)
        result = multiplier * (x_value + inner_constant)
        difficulty = 4 if index <= 30 else 5
        prompt = f"Resolva: {multiplier}(x + {inner_constant}) = {result}"
        explanation = f"Divida por {multiplier} e depois subtraia {inner_constant}. Assim, x = {x_value}."
        questions.append(
            _input(
                f"qb-equacao-dois-passos-{index:03d}",
                "lesson-018",
                prompt,
                difficulty,
                str(x_value),
                explanation,
                "Desfaca a multiplicacao e depois o termo somado.",
                "equacoes dois passos",
                36,
            )
        )
    return questions


def _power_questions() -> list[QuestionSeed]:
    questions: list[QuestionSeed] = []
    index = 1
    for base in range(2, 16):
        for exponent in (2, 3, 4):
            answer = str(base**exponent)
            difficulty = 3 if exponent == 2 else 4 if exponent == 3 else 5
            questions.append(
                _mc(
                    f"qb-potencia-{index:03d}",
                    "lesson-014",
                    f"Quanto e {base}^{exponent}?",
                    difficulty,
                    answer,
                    [str((base**exponent) + 1), str(max(1, (base**exponent) - base)), str((base**exponent) + base)],
                    f"Multiplique {base} por ele mesmo {exponent} vezes. O resultado e {answer}.",
                    "Potencia e multiplicacao repetida.",
                    "potenciacao",
                    24 if exponent < 4 else 30,
                )
            )
            index += 1
    return questions


def _root_questions() -> list[QuestionSeed]:
    questions: list[QuestionSeed] = []
    perfect_squares = [value * value for value in range(2, 42)]
    for index, value in enumerate(perfect_squares, start=1):
        answer = str(int(value**0.5))
        difficulty = 3 if index <= 15 else 4 if index <= 30 else 5
        questions.append(
            _input(
                f"qb-raiz-{index:03d}",
                "lesson-015",
                f"Qual e a raiz quadrada de {value}?",
                difficulty,
                answer,
                f"Procure o numero que multiplicado por ele mesmo gera {value}. Esse numero e {answer}.",
                "Pense em qual numero ao quadrado gera o valor dado.",
                "radiciacao",
                22 if difficulty == 3 else 28,
            )
        )
    return questions


def _power_expression_questions() -> list[QuestionSeed]:
    questions: list[QuestionSeed] = []
    for index in range(1, 61):
        base = 2 + (index % 8)
        if index <= 20:
            exponent = 2 + (index % 2)
            multiplier = 2 + (index % 5)
            answer = str((base**exponent) * multiplier)
            prompt = f"Quanto e {base}^{exponent} x {multiplier}?"
            explanation = f"Calcule {base}^{exponent} e depois multiplique por {multiplier}. O resultado e {answer}."
        elif index <= 40:
            exponent = 2 + (index % 3)
            sub = 1 + (index % 6)
            answer = str((base**exponent) - sub)
            prompt = f"Quanto e {base}^{exponent} - {sub}?"
            explanation = f"Calcule {base}^{exponent} e depois subtraia {sub}. O resultado e {answer}."
        else:
            exponent = 2
            extra = 3 + (index % 7)
            answer = str((base**exponent) + (extra**2))
            prompt = f"Quanto e {base}^2 + {extra}^2?"
            explanation = f"Calcule as duas potencias e some os resultados. O total e {answer}."
        difficulty = 4 if index <= 40 else 5
        questions.append(
            _mc(
                f"qb-potencia-expressao-{index:03d}",
                "lesson-019",
                prompt,
                difficulty,
                answer,
                [str(int(answer) + 2), str(max(1, int(answer) - 3)), str(int(answer) + 6)],
                explanation,
                "Resolva primeiro as potencias.",
                "expressoes com potencia",
                32,
            )
        )
    return questions


def _scientific_notation_questions() -> list[QuestionSeed]:
    questions: list[QuestionSeed] = []
    for index in range(1, 61):
        if index <= 30:
            coefficient = 11 + index
            exponent = 2 + (index % 5)
            whole = coefficient * (10**exponent)
            answer = f"{coefficient} x 10^{exponent}"
            prompt = f"Escreva {whole} em notacao cientifica."
            explanation = f"Desloque a virgula para obter {coefficient} e multiplique por 10^{exponent}."
        else:
            coefficient = 12 + (index % 18)
            exponent = 2 + (index % 4)
            answer = str(coefficient * (10**exponent))
            prompt = f"Quanto e {coefficient} x 10^{exponent}?"
            explanation = f"Multiplicar por 10^{exponent} desloca as casas decimais. O resultado e {answer}."
        difficulty = 4 if index <= 30 else 5
        questions.append(
            _input(
                f"qb-notacao-cientifica-{index:03d}",
                "lesson-020",
                prompt,
                difficulty,
                answer,
                explanation,
                "Observe quantas casas o 10 elevado move.",
                "notacao cientifica",
                34,
            )
        )
    return questions


def build_question_bank() -> list[QuestionSeed]:
    return [
        *_sum_questions(),
        *_subtraction_questions(),
        *_multiplication_questions(),
        *_division_questions(),
        *_fraction_equivalent_questions(),
        *_fraction_sum_questions(),
        *_fraction_compare_questions(),
        *_fraction_simplification_questions(),
        *_percentage_questions(),
        *_percentage_transform_questions(),
        *_equation_questions(),
        *_equation_two_step_questions(),
        *_power_questions(),
        *_root_questions(),
        *_power_expression_questions(),
        *_scientific_notation_questions(),
    ]
