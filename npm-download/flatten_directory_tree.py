#! /usr/bin/python3

# Copies a list of files into a destination directory, renaming each one by
# prepending its parent directory names to the file's base name. This enables
# copying a whole tree of files with non-unique names into a single directory.

import os
import os.path
import sys


def do_op(dest_dir: str, remove_prefix: str, slash_replace: str, op: str):
    while True:
        src_path = ""
        try:
            src_path = input()
        except EOFError:
            break

        slice_start = len(remove_prefix) if src_path.startswith(remove_prefix) else 0

        dest_basename = src_path[slice_start:].replace(os.path.sep, slash_replace)

        dest_path = os.path.join(dest_dir, dest_basename)

        command = f"{op} {src_path} {dest_path}"
        print(command)
        os.system(command)



def main(args: list[str]) -> int:
    if len(args) < 2:
        print(f"usage: {args[0]} <dest_dir> [path prefix to remove]")
        return 1

    dest_dir = args[1]
    remove_prefix = args[2] if len(args) > 2 else ""

    slash_replacement = "_"

    op = "mv"

    do_op(dest_dir, remove_prefix, slash_replacement, op)


if __name__ == "__main__":
    ret = main(sys.argv)
    sys.exit(ret)
