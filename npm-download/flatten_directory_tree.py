#! /usr/bin/python3

# Reads newline-separated paths from stdin and moves the corresponding files
# into a new directory, renaming them by prepending the parent directory names
# to the basename. This enables flattening a whole filetree with non-unique filenames
# into a single directory.

import argparse
import os.path
import subprocess
import sys


def do_op(dest_dir: str, remove_prefix: str, slash_replace: str, op: str, print_cmd: bool):
    while True:
        src_path = ""
        try:
            src_path = input()
        except EOFError:
            break

        slice_start = len(remove_prefix) if src_path.startswith(remove_prefix) else 0
        dest_basename = src_path[slice_start:].replace(os.path.sep, slash_replace)
        dest_path = os.path.join(dest_dir, dest_basename)
        command = f"{op} {src_path} -> {dest_path}"

        if print_cmd:
            print(command)

        return subprocess.run([op, src_path, dest_path]).returncode



def main(args: list[str]) -> int:
    arg_parser = argparse.ArgumentParser(
            description="Reads newline-separated paths from stdin and moves the corresponding files into a new directory, renaming them by prepending the parent directory names to the basename. This enables flattening a whole filetree with non-unique filenames into a single directory."
    )

    arg_parser.add_argument("-d", "--dir", required=True, help="destination directory for renamed files")
    arg_parser.add_argument("-p", "--prefix", default="", help="prefix to remove from input path")
    arg_parser.add_argument("-s", "--separator", default="_", help="replacement for path separator in generated filename (default '_')")
    arg_parser.add_argument("-v", "--verbose", action="store_true", default=False, help="print out mv/cp command for each file")
    arg_parser.add_argument("--copy", action="store_true", default=False, help="copy files instead of moving")
    # arg_parser.add_argument("--op", default="mv", help="command to run using the old and new paths (default: mv)")


    parsed_args = arg_parser.parse_args()
    dest_dir = parsed_args.dir
    remove_prefix = parsed_args.prefix
    slash_replacement = parsed_args.separator

    op = "cp" if parsed_args.copy else "mv"
    print_cmd = parsed_args.verbose

    return do_op(dest_dir, remove_prefix, slash_replacement, op, print_cmd)


if __name__ == "__main__":
    ret = main(sys.argv)
    sys.exit(ret)
