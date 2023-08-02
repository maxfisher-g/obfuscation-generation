# reads a list of file sizes (in bytes), one per line,
# then prints quantiles of the sizes

import statistics
import sys

def main(args) -> int:
    if len(args) < 2:
        print(f"usage; {args[0]} <filename> [quantiles]")
        return 1
    filename = args[1]

    num_quantiles = 10
    if len(args) > 2:
        try:
            num_quantiles = int(args[2])
        except:
            print("Number of quantiles must be an integer")
            return -1

    data = []
    with open(filename, "rt", encoding="utf-8") as f:
        for line_idx, line in enumerate(f):
            if line.strip() != "":
                try:
                    data.append(int(line))
                except:
                    line_num = line_idx + 1
                    print(f"line {line_num}: {line} is not an integer")

    quantiles = statistics.quantiles(data, n=num_quantiles, method="exclusive")

    percent_multiplier = 100/num_quantiles

    for i, x in enumerate((int(round(q)) for q in quantiles)):
        closest_percentile = int(round(percent_multiplier * (i+1)))
        print(f"q{i+1:-3d} ({closest_percentile:3d}%): {x}")



if __name__ == "__main__":
    ret = main(sys.argv)
    sys.exit(ret)
