import argparse
import io
import sentencepiece as spm
from enum import IntEnum
from pathlib import Path
from textwrap import dedent
from typing import Iterable


# for use with minloglevel argument to SentencePieceTrainer.Train()
class LogLevel (IntEnum):
    WARNING = 1
    INFO = 0


whitespace_symbols = [ "\n", " ", "\t", "\r", "\v", "\f" ]


def train_model(input_filenames: Iterable[str], verbose: bool) -> io.BytesIO:
    # max input size (filesize) is 10k bytes
    # TODO consider splitting up long files into multiple sections
    max_sentence_size = 10000

    vocab_size = 48000

    # aim to tokenize 99% of input characters
    character_coverage = 0.99

    min_log_level = LogLevel.INFO if verbose else LogLevel.WARNING

    def filename_to_sentence(filename: str) -> bytes:
        return Path(filename).read_text(errors="ignore")

    model = io.BytesIO()

    spm.SentencePieceTrainer.Train(
        sentence_iterator=map(filename_to_sentence, input_filenames),
        model_writer=model,
        vocab_size=vocab_size,
        model_type="bpe",
        max_sentence_length=max_sentence_size,
        character_coverage=character_coverage,
        minloglevel=min_log_level,
        user_defined_symbols=["\n"],  # include newline in vocabulary
        normalization_rule_name="identity",  # don't replace unicode chars with equivalent ones
        remove_extra_whitespaces=False,
        allow_whitespace_only_pieces=True,
        split_by_whitespace=False,  # allow whitespace within tokens, e.g. ") {"
        byte_fallback=True,
    )

    return model


def test_model(model_filename, test_string):
    sp = spm.SentencePieceProcessor()

    with open(model_filename, "rb") as modelfile:
        sp.LoadFromSerializedProto(modelfile.read())

    #sp.LoadFromSerializedProto(model.getvalue())

    print("\n== Encoding test ==\n")
    print(test_string)
    print("\nencodes to\n")
    print(sp.Encode(test_string, out_type=int))
    print(sp.Encode(test_string, out_type=str))


def main():
    arg_parser = argparse.ArgumentParser(
        description="Trains sentencepiece tokenizer model from input files and outputs"
        "serialized proto model file"
    )

    default_test_string = dedent("""
        console.log("hello world");
        for (let i = 0; i < 10; i++) {
            console.log(i%3);
        }
    """)

    arg_parser.add_argument("-f", "--files", required=True, type=Path,
            help="list of source files to process, one path per line")
    arg_parser.add_argument("-o", "--output", required=True, type=Path,
            help="output model file")
    arg_parser.add_argument("-l", "--limit", type=int, metavar="NUM", default=-1,
            help="only train using first NUM input files")
    arg_parser.add_argument("-t", "--test-string", default=default_test_string,
            help="test tokenizing on given string after training")
    arg_parser.add_argument("-v", "--verbose", action="store_true", default=False,
            help="print out logging info while training")

    parsed_args = arg_parser.parse_args()

    model_output_path = parsed_args.output
    input_filepath = parsed_args.files
    limit = parsed_args.limit
    verbose = parsed_args.verbose
    test_string = parsed_args.test_string

    with open(input_filepath) as input_file:
        files = list(map(str.strip, input_file.readlines()))

    if limit > 0:
        files = files[:limit]

    model = train_model(files, verbose)

    with open(model_output_path, "wb") as model_file:
        model_file.write(model.getvalue())

    if test_string:
        test_model(model_output_path, test_string)


if __name__ == "__main__":
    main()
