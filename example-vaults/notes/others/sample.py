"""
A short Python sample served as source by leyline-web.

The .py extension is in config.yaml's text_extensions list, so the
engine renders this file as a <pre> block. Nothing is executed.
"""


def fibonacci(n: int) -> list[int]:
    """Return the first n Fibonacci numbers."""
    seq = [0, 1]
    while len(seq) < n:
        seq.append(seq[-1] + seq[-2])
    return seq[:n]


if __name__ == "__main__":
    print(fibonacci(10))
