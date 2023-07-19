#! /bin/bash

DEST_DIR="${DEST_DIR:-../non-obfuscated-files}"

if [[ $# -eq 0 ]]; then
	echo "Usage: $0 <files...>"
	exit 1
fi

function extract {
	echo "$1"
	export EXTRACT_DIR=$(basename "${1%%.tgz}")
	mkdir "$EXTRACT_DIR"
	tar -xf "$1" -C "$EXTRACT_DIR" --delay-directory-restore
	find "$EXTRACT_DIR" -type d -exec chmod +x '{}' ';'
	find "$EXTRACT_DIR" -type f -name "*.js" | ./flatten_directory_tree.py -d "$DEST_DIR" && \rm -rf "$EXTRACT_DIR"
	unset EXTRACT_DIR
}


for f in "$@"; do
	extract "$f"
done

