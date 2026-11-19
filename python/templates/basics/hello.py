"""Hello from n3xn Python Studio."""
from datetime import datetime

def greet(name):
    return f"Hello, {name}! Python is running in WebAssembly."

print(greet("n3xn"))
print("Runtime:", "Pyodide / CPython")
print("Date:", datetime.now().strftime("%Y-%m-%d"))
print()
for number in range(1, 6):
    print(f"{number:>2}  {'🐍' * number}")
