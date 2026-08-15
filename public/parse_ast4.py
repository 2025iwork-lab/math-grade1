import sys, re
text = sys.stdin.read()
# remove comments and strings to safely count braces
text = re.sub(r'//.*', '', text)
text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
text = re.sub(r'"(?:\\.|[^"\\])*"', '""', text)
text = re.sub(r"'(?:\\.|[^'\\])*'", "''", text)
text = re.sub(r"`(?:\\.|[^`\\])*`", "``", text)

stack = []
lines = text.split('\n')
for i, line in enumerate(lines):
    for j, c in enumerate(line):
        if c == '{':
            stack.append((i+1, j))
        elif c == '}':
            if stack and stack[-1][0] > 0:
                stack.pop()
            else:
                pass
        elif c == '(':
            stack.append((-(i+1), j))
        elif c == ')':
            if stack and stack[-1][0] < 0:
                stack.pop()
            else:
                if stack:
                    print(f"Mismatched ) at line {i+1}. Expected closing for {{ at line {stack[-1][0]}, col {stack[-1][1]}")
                sys.exit(0)
