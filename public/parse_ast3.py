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
    for c in line:
        if c == '{':
            stack.append(i+1)
        elif c == '}':
            if stack:
                stack.pop()
            else:
                print(f"Extra }} at line {i+1}")
        elif c == '(':
            stack.append(-(i+1))
        elif c == ')':
            if stack and stack[-1] < 0:
                stack.pop()
            else:
                print(f"Mismatched ) at line {i+1}. Stack top: {stack[-1] if stack else 'empty'}")
