#! /bin/bash

TGZ_DIR="${TGZ_DIR:-tgz}"
DEST_DIR="${DEST_DIR:-extracted-js-files}"

if [[ ! -d "$TGZ_DIR" ]]; then
	echo "archive dir ($TGZ_DIR) is not a directory" 
	exit 1
fi

mkdir -p "$DEST_DIR"

function extract_tgz {
	export EXTRACT_DIR=$(basename "${1%%.tgz}")
	mkdir "$EXTRACT_DIR"

	# some NPM archives have directories without the exec permission set, so
	# --delay-directory-restore plus the following find command is needed
	tar -xf "$1" -C "$EXTRACT_DIR" --delay-directory-restore
	find "$EXTRACT_DIR" -type d -execdir chmod +x '{}' ';'

	# EXTRACT_DIR/a/b/c.js -> DEST_DIR/EXTRACT_DIR/a/b/c.js
	find "$EXTRACT_DIR" -type f -not -name "*.js" -delete && mv "$EXTRACT_DIR" "$DEST_DIR" 

	unset EXTRACT_DIR
}


for f in "$TGZ_DIR/*"; do
	echo "$f"
	extract_tgz "$f"
done
