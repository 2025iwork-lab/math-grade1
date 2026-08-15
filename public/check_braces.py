import sys
text = sys.stdin.read()
stack = []
in_string = False
string_char = ''
in_comment = False
in_block_comment = False
line = 1
for i, c in enumerate(text):
    if c == '\n':
        line += 1
    if not in_string and not in_comment and not in_block_comment:
        if c == '/' and i+1 < len(text) and text[i+1] == '/':
            in_comment = True
        elif c == '/' and i+1 < len(text) and text[i+1] == '*':
            in_block_comment = True
        elif c in '"\'`':
            in_string = True
            string_char = c
        elif c == '{':
            stack.append(line)
        elif c == '}':
            if stack:
                stack.pop()
            else:
                print(f"Unmatched }} at line {line}")
    elif in_comment:
        if c == '\n':
            in_comment = False
    elif in_block_comment:
        if c == '*' and i+1 < len(text) and text[i+1] == '/':
            in_block_comment = False
    elif in_string:
        if c == '\\':
            continue
        if c == string_char:
            in_string = False

print(f"Unclosed {{ at lines: {stack}")
