from __future__ import annotations

import ast
from typing import Dict, List


def analyze_python(source_code: str) -> Dict[str, object]:
    findings: List[Dict[str, object]] = []

    try:
        tree = ast.parse(source_code)
    except SyntaxError as exc:
        return {
            "language": "python",
            "analysis_type": "python_ast",
            "valid_syntax": False,
            "parse_error": {
                "line": exc.lineno,
                "offset": exc.offset,
                "message": exc.msg,
            },
            "functions": [],
            "loops": 0,
            "branches": 0,
            "max_loop_depth": 0,
            "time_complexity": "Unknown",
            "space_complexity": "Unknown",
            "findings": [],
        }

    functions: List[Dict[str, object]] = []
    loop_count = 0
    branch_count = 0
    max_loop_depth = 0

    class Analyzer(ast.NodeVisitor):
        def __init__(self) -> None:
            self.loop_depth = 0

        def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
            nonlocal loop_count
            recursive = any(
                isinstance(child, ast.Call)
                and isinstance(child.func, ast.Name)
                and child.func.id == node.name
                for child in ast.walk(node)
            )
            functions.append({
                "name": node.name,
                "line": node.lineno,
                "arguments": [argument.arg for argument in node.args.args],
                "recursive": recursive,
            })
            self.generic_visit(node)

        def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
            functions.append({
                "name": node.name,
                "line": node.lineno,
                "arguments": [argument.arg for argument in node.args.args],
                "recursive": False,
            })
            self.generic_visit(node)

        def visit_For(self, node: ast.For) -> None:
            nonlocal loop_count, max_loop_depth
            loop_count += 1
            self.loop_depth += 1
            max_loop_depth = max(max_loop_depth, self.loop_depth)
            self.generic_visit(node)
            self.loop_depth -= 1

        def visit_While(self, node: ast.While) -> None:
            nonlocal loop_count, max_loop_depth
            loop_count += 1
            self.loop_depth += 1
            max_loop_depth = max(max_loop_depth, self.loop_depth)
            self.generic_visit(node)
            self.loop_depth -= 1

        def visit_If(self, node: ast.If) -> None:
            nonlocal branch_count
            branch_count += 1
            self.generic_visit(node)

    visitor = Analyzer()
    visitor.visit(tree)

    if max_loop_depth >= 3:
        time_complexity = f"O(n^{max_loop_depth})"
    elif max_loop_depth == 2:
        time_complexity = "O(n^2)"
    elif max_loop_depth == 1:
        time_complexity = "O(n)"
    else:
        time_complexity = "O(1) or O(log n)"

    has_mutation_during_iteration = False
    has_linear_remove = False
    for loop in (node for node in ast.walk(tree) if isinstance(node, (ast.For, ast.While))):
        for child in ast.walk(loop):
            if not isinstance(child, ast.Call) or not isinstance(child.func, ast.Attribute):
                continue
            if child.func.attr in {"remove", "pop", "insert"}:
                has_mutation_during_iteration = True
                if child.func.attr == "remove":
                    has_linear_remove = True

    if has_mutation_during_iteration:
        findings.append({
            "label": "Collection mutation during iteration",
            "severity": "high",
            "description": "The AST contains remove/pop/insert calls near loop control. Mutation can skip or shift elements.",
        })
    if has_linear_remove:
        findings.append({
            "label": "Linear remove inside loop",
            "severity": "medium",
            "description": "list.remove() performs a linear search and may make repeated loop work quadratic.",
        })
    if max_loop_depth >= 2:
        findings.append({
            "label": "Nested loop structure",
            "severity": "medium",
            "description": f"The AST shows nested loop depth {max_loop_depth}; inspect whether the same input is visited repeatedly.",
        })
    if not findings:
        findings.append({
            "label": "No supported structural antipattern detected",
            "severity": "clean",
            "description": "The Python AST parsed successfully and no nested loops or collection-mutation patterns were found.",
        })

    has_recursion = any(function["recursive"] for function in functions)
    space_complexity = "O(n)" if has_recursion or max_loop_depth >= 2 else "O(1)"

    return {
        "language": "python",
        "analysis_type": "python_ast",
        "valid_syntax": True,
        "parse_error": None,
        "functions": functions,
        "loops": loop_count,
        "branches": branch_count,
        "max_loop_depth": max_loop_depth,
        "time_complexity": time_complexity,
        "space_complexity": space_complexity,
        "findings": findings,
    }
