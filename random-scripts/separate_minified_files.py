import re
import sys

def write_file(filename, lines):
    with open(filename, "wt") as f:
        for line in lines:
            f.write(f"{line}\n")

def main(args):
    if len(args) == 1:
        print(f"Usage: {args[0]} <extracted_filenames.txt>")
        return -1

    min_js = re.compile("[_\.-]min.js") # .min.js, -min.js, _min.js

    # files which we know are minified (based on filename)
    minified = list()
    # files which are not minified, but which may or may not have a minified version included
    remaining = set()

    with open(args[1], "rt", encoding="utf-8") as extracted_filenames:
        for f in extracted_filenames:
            f = f.rstrip()
            if min_js.search(f):
                minified.append(f)
            else:
                remaining.add(f)

    # if minified contains example.min.js, check remaining for example.js
    minified_originals = [f for f in (min_js.sub(".js", m) for m in minified) if f in remaining]

    # what's left is non-minified files without a corresponding minified version
    for o in minified_originals:
        remaining.remove(o)
    unminified = sorted(list(remaining))

    write_file("minified-files.txt", minified)
    write_file("minified-originals.txt", minified_originals)
    write_file("unminified-files.txt", unminified)

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
