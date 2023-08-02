#! /bin/bash

FILENAME="$1"
awk '{ print length }' "$FILENAME" | ./average_top_percentage.py
