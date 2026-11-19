"""A small standard-library data and statistics lab."""
import random
import statistics

random.seed(42)
values = [random.randint(10, 99) for _ in range(24)]
print("N3XN NUMBER LAB")
print("=" * 42)
print("Values:", values)
print()
print(f"Count:   {len(values)}")
print(f"Min:     {min(values)}")
print(f"Max:     {max(values)}")
print(f"Mean:    {statistics.mean(values):.2f}")
print(f"Median:  {statistics.median(values):.2f}")
print(f"Std dev: {statistics.pstdev(values):.2f}")
print()
print("Sorted values:")
print(" ".join(str(v) for v in sorted(values)))
