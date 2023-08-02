DEST_DIR="$1"

if [[ ! -d "$DEST_DIR" ]]; then
	echo "extract dir () is not a directory"
	echo "usage: $0 <extracted files dir>"
	exit 1
fi

EXTRACT="all-extracted.txt"
MINIFIED="minified.txt"
UNMINIFIED="unminified.txt"
MAYBE_MINIFIED="maybe-minified.txt"
UNSORTED_ORIGINALS="unsorted-originals.txt"
ORIGINALS="minified-originals.txt"

# list the extracted files
find "$DEST_DIR" -type f | sort > "$EXTRACT"

# extract minified filenames
grep -P "[_\.-]min.js|\.production.js" "$EXTRACT" > "$MINIFIED"

# the remainder may or may not be minified, depending on
# if the minified files above have a corresponding unminified version
comm -2 -3 "$EXTRACT" "$MINIFIED" > "$MAYBE_MINIFIED"

# find the original files that have minified versions
for f in $(sed 's/[_\.-]min\.js/.js/' "$MINIFIED"); do
	if [[ -f "$f" ]]; then
		echo "$f" >> "$UNSORTED_ORIGINALS"
	fi
done

sort "$UNSORTED_ORIGINALS" > "$ORIGINALS"

comm -2 -3 "$MAYBE_MINIFIED" "$ORIGINALS" > "$UNMINIFIED"

rm "$EXTRACT"
rm "$UNSORTED_ORIGINALS"
rm "$MAYBE_MINIFIED"
