import sys, re
text = sys.stdin.read()
def replacer(m):
    return re.sub(r'[^\n]', ' ', m.group(0))

text = re.sub(r'//.*', replacer, text)
text = re.sub(r'/\*.*?\*/', replacer, text, flags=re.DOTALL)
text = re.sub(r'"(?:\\.|[^"\\])*"', replacer, text)
text = re.sub(r"'(?:\\.|[^'\\])*'", replacer, text)
text = re.sub(r"`(?:\\.|[^`\\])*`", replacer, text)

stack = []
lines = text.split('\n')
for i, line in enumerate(lines):
    if i+1 == 1519:
        print(f"Stack before 1519: {stack}")
    for j, c in enumerate(line):
        if c == '{':
            stack.append((i+1, j))
        elif c == '}':
            if stack and stack[-1][0] > 0:
                stack.pop()
        elif c == '(':
            stack.append((-(i+1), j))
        elif c == ')':
            if stack and stack[-1][0] < 0:
                stack.pop()
            else:
                print(f"Mismatched ) at line {i+1}. Expected closing for {stack[-1]}")
                sys.exit(0)
