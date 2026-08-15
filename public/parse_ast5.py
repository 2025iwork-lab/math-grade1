import sys, re
text = sys.stdin.read()
# Replace characters with spaces but keep newlines
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
                    print(f"Mismatched ) at line {i+1}. Expected closing for {{ at line {stack[-1][0]}")
                sys.exit(0)
if stack:
    print(f"Unclosed: {stack}")
