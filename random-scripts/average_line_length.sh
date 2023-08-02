#! /bin/bash

FILENAME="$1"

# prints count for each line and then average
#awk '{ len=length($0); printf("%-5s %d\n", NR, len); total+=len} END { printf("average: %d\n", total/NR); }' "$FILENAME"

# just prints average
awk '{ total+=length($0) } END { printf("%d\n", total/NR); }' "$FILENAME"
