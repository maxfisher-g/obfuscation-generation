import io
import sentencepiece as spm
from pathlib import Path
from enum import IntEnum


# for use with minloglevel
class LogLevel (IntEnum):
    WARNING = 1
    INFO = 0


def train_model(input_filenames: list[str]) -> io.BytesIO:
    sentences = map(lambda filename: Path(filename.strip()).read_bytes(), input_filenames)

    model = io.BytesIO()

    spm.SentencePieceTrainer.Train(
        sentence_iterator=sentences,
        model_writer=model,
        vocab_size=16000,
        model_type="bpe",
        max_sentence_length=50000,
        character_coverage=0.995,
        minloglevel=LogLevel.INFO,
        user_defined_symbols=["\n"],  # include newline in vocabulary
        normalization_rule_name="identity",  # don't replace unicode chars with equivalent ones
        remove_extra_whitespaces=0,
        allow_whitespace_only_pieces=1,
        split_by_whitespace=0,  # allow whitespace within tokens, e.g. ") {"
    )

    return model


def test_model(model_filename):
    sp = spm.SentencePieceProcessor()

    with open(model_filename, "rb") as modelfile:
        sp.LoadFromSerializedProto(modelfile.read())

    test_string = "console.log('hello world'); \n\nfor (let i = 0; i < 10; i++) {\n console.log(i%3); } ;"
    print(sp.Encode(test_string, out_type=int))
    print(sp.Encode(test_string, out_type=str))


def train_new_model(model_filename):
    limit = -1

    with open("non-obfuscated-files.txt") as files_file:
        files = files_file.readlines()

    if limit > 0:
        files = files[:limit]

    model = train_model(files)

    with open(model_filename, "wb") as modelfile:
        modelfile.write(model.getvalue())


def main():
    model_file = "tokenizer-model.model"

    train_new_model(model_file)
    test_model(model_file)


if __name__ == "__main__":
    main()
