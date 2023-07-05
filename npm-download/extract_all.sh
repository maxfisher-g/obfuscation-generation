#! /bin/bash

DEST_DIR=../non-obfuscated-files

for f in *; do
	echo "$f"
	export EXTRACT_DIR="${f%%.tgz}"
	mkdir "$EXTRACT_DIR" && tar -xf "$f" -C "$EXTRACT_DIR" && find "$EXTRACT_DIR" -name "*.js" | ./flatten_directory_tree.py "$DEST_DIR" && \rm -rf "$EXTRACT_DIR"
	unset EXTRACT_DIR
done

