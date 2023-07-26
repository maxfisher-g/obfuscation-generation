import os.path
import sys
import tensorflow as tf
from pathlib import Path
from tensorflow.io import TFRecordWriter


non_obfuscated_js_files_list = "extracted-js-files.txt"
record_dir = Path("tfrecords")
samples_per_record = 4096

# some code below adapted from
# keras.io/examples/keras_recipes/creating_tfrecords

def bytes_feature(value: str|bytes):
    """Returns a bytes_list from a string / byte."""
    if isinstance(value, str):
        value = value.encode()

    return tf.train.Feature(bytes_list=tf.train.BytesList(value=[value]))

def int64_feature(value):
    """Returns an int64_list from a bool / enum / int / uint."""
    return tf.train.Feature(int64_list=tf.train.Int64List(value=[value]))

def create_example(js_filename: str, is_obfuscated: bool):
    # not all files are in utf-8
    js_file_data = Path(js_filename).read_bytes()

    feature = {
        "filename": bytes_feature(js_filename),
        "js_file_data": bytes_feature(js_file_data),
        "obfuscated": int64_feature(is_obfuscated),
    }
    return tf.train.Example(features=tf.train.Features(feature=feature))

def main():
    if not os.path.exists(non_obfuscated_js_files_list):
        print(f"Non-obfuscated JS files list does not exist at {non_obfuscated_js_files_list}")
        return 1

    if not record_dir.exists():
        os.mkdir(record_dir)

    record_number = 1
    with open(non_obfuscated_js_files_list, "rt") as non_obfuscated_files:
        eof = False
        while not eof:
            record_filename = f"{record_number}.tfrec"
            with TFRecordWriter(bytes(record_dir / record_filename)) as writer:
                sample_number = 0
                while not eof:

                    js_filename = non_obfuscated_files.readline().strip()
                    if not js_filename:
                        eof = True
                        break

                    print(f"[{record_filename} {sample_number % samples_per_record}/{samples_per_record}] {js_filename}")

                    example = create_example(js_filename, False)
                    writer.write(example.SerializeToString())

                    sample_number += 1
                    if sample_number % samples_per_record == 0:
                        print("break")
                        break

            record_number += 1

    return 0

if __name__ == "__main__":
    ret = main()
    sys.exit(ret)
