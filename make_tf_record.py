import argparse
import os
import os.path
import sys
from pathlib import Path

# disable tensorflow warnings on import:
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import tensorflow as tf
from tensorflow.io import TFRecordWriter


# some code below adapted from
# keras.io/examples/keras_recipes/creating_tfrecords

def bytes_feature(value: str | bytes):
    """Returns a bytes_list from a string / byte."""
    if isinstance(value, str):
        value = value.encode(encoding="utf-8")

    return tf.train.Feature(bytes_list=tf.train.BytesList(value=[value]))


def int64_feature(value):
    """Returns an int64_list from a bool / enum / int / uint."""
    return tf.train.Feature(int64_list=tf.train.Int64List(value=[value]))


def create_example(source_filename: str, is_obfuscated: bool):
    # note: not all files are in utf-8, so we don't decode yet
    # TODO print warning if file is not in UTF-8
    source_file_data = Path(source_filename).read_bytes()

    feature = {
        "filename": bytes_feature(source_filename),
        "data": bytes_feature(source_file_data),
        "obfuscated": int64_feature(is_obfuscated),
    }
    return tf.train.Example(features=tf.train.Features(feature=feature))


def main():
    arg_parser = argparse.ArgumentParser(
        description="Packs source files into tfrecord format with a label as either obfuscated or non-obfuscated"
    )

    arg_parser.add_argument("-d", "--dir", required=True, type=Path,
                            help="output directory for tfrecord files")
    arg_parser.add_argument("-f", "--files", required=True, type=Path,
                            help="list of source files to process, one path per line")
    arg_parser.add_argument("-l", "--label", required=True, type=int,
                            help="obfuscation label for files, either 0 (non-obfuscated) or 1 (obfuscated)")
    arg_parser.add_argument("-n", "--nrecords", default="65536", type=int, metavar="NUM",
                            help="number of files to store in each tfrecord file (default 65536)")
    arg_parser.add_argument("-p", "--prefix", default="",
                            help="prefix to add to generated tfrecord filenames")
    arg_parser.add_argument("-v", "--verbose", action="store_true", default=False,
                            help="print out verbose progress info")

    parsed_args = arg_parser.parse_args()

    record_dir = parsed_args.dir
    samples_per_record = parsed_args.nrecords
    files_list = parsed_args.files
    print_progress = parsed_args.verbose
    prefix = parsed_args.prefix

    match parsed_args.label:
        case 0:
            obfuscation_label = False
        case 1:
            obfuscation_label = True
        case _:
            print("Obfuscation label must be either 0 or 1")
            return 1

    if not os.path.exists(files_list):
        print(f"path to file list does not exist: {files_list}")
        return 1

    if not record_dir.exists():
        os.mkdir(record_dir)

    record_num = 1
    with open(files_list, "rt") as source_files:
        eof = False
        while not eof:
            record_filename = f"{prefix}{record_num}.tfrec"
            with TFRecordWriter(bytes(record_dir / record_filename)) as writer:
                sample_num = 0
                while not eof:
                    source_filename = source_files.readline().strip()
                    if not source_filename:
                        eof = True
                        break

                    if print_progress:
                        print(f"[{record_filename} {sample_num % samples_per_record}/{samples_per_record}]",
                              source_filename)

                    example = create_example(source_filename, obfuscation_label)
                    writer.write(example.SerializeToString())

                    sample_num += 1
                    if sample_num % samples_per_record == 0:
                        break

            record_num += 1

    return 0


if __name__ == "__main__":
    ret = main()
    sys.exit(ret)
