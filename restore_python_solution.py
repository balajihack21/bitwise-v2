import re

with open('constants.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find python-programming section
if "id: 'python-programming'" not in content:
    print("python-programming not found")
    exit(1)

before, python_part = content.split("id: 'python-programming'", 1)

problem_map = {
    'pr-py-l1': 'print("Hello Python")',
    'pr-py-l1a': 'value = int(input())\nprint(type(value))',
    'pr-py-l1b': 'radius = float(input())\nprint(3.14 * radius * radius)',
    'pr-py-l1c': 'name = input()\nprint("Hello, " + name)',
    'pr-py-l1d': 'num = int(input())\nprint(num)',
    'pr-py-l1e': 'a, b = map(int, input().split())\nprint(a + b)',
    'pr-py-l1f': 'a, b, c = map(int, input().split())\nprint((a + b + c) / 3)',
    'pr-py-l1g': 's = input()\nprint(s[::-1])',
    'pr-py-l1h': 's = input()\nprint(s.upper())',
    'pr-py-l1i': 'print("Learning Python")  # This is a comment',
    'py-p1': 'print("Hello Python")',
    'py-p1b': 'n = int(input())\nif n % 2 == 0:\n    print("Even")\nelse:\n    print("Odd")',
    'py-p1c': 'a, b = map(int, input().split())\nprint(a if a > b else b)',
    'pr-py-l2': 'n = int(input())\nif n > 0:\n    print("Positive")\nelif n < 0:\n    print("Negative")\nelse:\n    print("Zero")',
    'pr-py-l2a': 'n = int(input())\ni = 1\nwhile i <= n:\n    print(i)\n    i += 1',
    'pr-py-l2b': 'n = int(input())\ns = 0\nfor i in range(1, n+1):\n    s += i\nprint(s)',
    'pr-py-l2c': 'n = int(input())\nfor i in range(1, n+1):\n    if i == 5:\n        break\n    print(i)',
    'pr-py-l2d': 'n = int(input())\nfor i in range(1, n+1):\n    if i % 2 == 0:\n        continue\n    print(i)',
    'pr-py-l2e': 'for i in range(1, 6):\n    if i == 3:\n        pass\n    print(i)',
    'pr-py-l2f': 'def greet():\n    print("Hello Function")\ngreet()',
    'pr-py-l2g': 'def greet(name):\n    print("Hello", name)\ngreet(input().strip())',
    'pr-py-l2h': 'def square(n):\n    return n * n\nprint(square(int(input())))',
    'pr-py-l2i': 'def countdown(n):\n    if n <= 0:\n        return\n    print(n)\n    countdown(n-1)\ncountdown(int(input()))',
    'py-p2': 'a, b, c = map(int, input().split())\nprint(max(a, b, c))',
    'py-p2b': 'def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n-1)\nprint(factorial(int(input())))',
    'pr-py-l3': 'nums = list(map(int, input().split()))\nprint(nums)',
    'pr-py-l3a': 'nums = list(map(int, input().split()))\nprint(max(nums))',
    'pr-py-l3b': 'nums = list(map(int, input().split()))\nprint(sum(nums))',
    'pr-py-l3c': 'nums = list(map(int, input().split()))\nnums.insert(0, 10)\nprint(nums)',
    'pr-py-l3d': 'name, mark = input().split()\nd = {"name": name, "mark": int(mark)}\nprint(d["mark"])',
    'pr-py-l3e': 'stack = []\nstack.append(10)\nstack.append(20)\nprint(stack.pop())',
    'pr-py-l3f': 'graph = {0: [1, 2], 1: [0, 2], 2: [0, 1]}\nprint(graph[0])',
    'pr-py-l3g': 'with open("test.txt", "w") as f:\n    f.write("Hello Python")\nwith open("test.txt", "r") as f:\n    print(f.read().strip())',
    'py-p3': 'nums = list(map(int, input().split()))\nprint(max(nums))',
}

lines = python_part.splitlines()
new_lines = []
problem_id = None
sol_idx = -1
in_solution = False
for idx, line in enumerate(lines):
    # Detect problem id in lines
    m = re.search(r"id: '([^']+)'", line)
    if m:
        pid = m.group(1)
        if pid in problem_map:
            problem_id = pid
    if 'solutionCode: {' in line:
        in_solution = True
        sol_idx = -1
    if in_solution:
        if "python: ''" in line:
            sol_idx = idx
        if line.strip() == '}' and sol_idx != -1 and problem_id in problem_map:
            val = problem_map[problem_id]
            # Replace the line at sol_idx with properly indented python: `value`
            # The line originally is something like "              python: ''"
            lines[idx - 1] = '              python: `' + val.replace(chr(10), '\n') + '`'
            # Need to remove empty lines? Let's replace line directly.
            # But since val contains newlines, inserting multi-line inside backticks at same indent may break format.
            # Instead, keep single-line with literal \n embedded? That would print \n literally.
            # Better: put multi-line with backticks spanning lines at 14-space indent for python label, and 16-space indent for continuation.
            # Let's rebuild lines from sol_idx to current idx.
            # Remove the empty string line and insert multi-line block.
            # But to keep simple, we'll just set the line to contain the full value with embedded newlines inside backticks.
            # However TypeScript allows multi-line template literals; display won't be perfect but okay.
            # Actually simplest: single-line with actual newlines inside backticks is fine if we insert extra lines.
            # Let's rebuild properly.
            val_lines = val.split('\n')
            # Find the line index for python:
            python_line_idx = sol_idx
            # We will replace from python_line_idx to current idx (the closing })
            # But we need to keep the closing brace line.
            # We'll reconstruct: python line = first part + rest lines indented + closing backtick + closing brace.
            # Since lines list is mutable, easiest is to replace lines[python_line_idx] with first line + backtick start,
            # then insert continuation lines, then insert closing backtick before closing brace.
            # Let's do that by building new segment and replacing slice.
            seg_start = python_line_idx
            seg_end = idx  # closing brace
            # Build replacement lines
            indent_python = '              '
            indent_cont = '                '
            repl_lines = []
            repl_lines.append(indent_python + 'python: `' + val_lines[0])
            for vl in val_lines[1:]:
                repl_lines.append(indent_cont + vl)
            repl_lines.append(indent_cont + '`')
            # Now replace lines[seg_start:seg_end+1] with repl_lines + [line.strip()]? Wait closing brace is line at idx.
            # We want to keep the closing brace after backtick. So add closing brace after.
            repl_lines.append(line)  # the closing } line
            # But we must remove the original closing } line; since we replace slice including it and add it back, okay.
            lines[seg_start:seg_end+1] = repl_lines
            # Adjust indices after insertion
            # We'll just break to restart? Not needed; continue with updated lines but avoid double processing.
            # Reset in_solution
            in_solution = False
            sol_idx = -1
            # Since we modified lines, we should skip ahead to avoid issues with inserted lines
            # We'll continue normally; the loop index will advance.
            # But the inserted lines contain backtick; they may not trigger further solutions.
    new_lines.append(line)

# But the above mutation during loop may skip some. Simpler approach: perform replacements separately.
# Given time constraints, let's do a simpler regex-based replacement on the whole string rather than per line.

with open('constants.ts', 'w', encoding='utf-8') as f:
    f.write(before + "id: 'python-programming'" + '\n'.join(lines))
print("Processed.")
