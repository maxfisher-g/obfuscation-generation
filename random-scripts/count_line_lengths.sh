#! /bin/bash

FILENAME="$1"
awk '{ print length }' "$FILENAME" | sort -n | uniq -c
