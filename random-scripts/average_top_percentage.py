#! /usr/bin/python3

import statistics
import sys
import math

def main(args) -> int:
    filename = "/dev/stdin"

    if len(args) >= 2:
        filename = args[1]

    average_top_percentage = 10

    if len(args) >= 3:
        try:
            average_top_percentage = int(args[2])
        except:
            print("Top percentage to average must be an integer")
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

    from_index = int(math.floor((100-average_top_percentage)/100*len(data)))

    data = sorted(data)

    top_data = data[from_index:]

    #print(sum(top_data))
    #print(len(top_data))

    print(sum(top_data)/len(top_data))

if __name__ == "__main__":
    ret = main(sys.argv)
    sys.exit(ret)
