# Word sources

Lists from [PyThaiNLP](https://github.com/PyThaiNLP/pythainlp), copied unchanged from the `dev`
branch, folder `pythainlp/corpus/`. Retrieved on 2026-10-21 from
`https://raw.githubusercontent.com/PyThaiNLP/pythainlp/dev/pythainlp/corpus/<file>`.

| File           | What it holds                                                                                                                   | Licence                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `words_th.txt` | 62,107 Thai words, one per line: the dictionary                                                                                 | CC0, per PyThaiNLP's `corpus_license.md` |
| `tnc_freq.txt` | `word<TAB>count`: how often 106,122 forms occur in the Thai National Corpus (33.5 million words, split into words by a program) | CC0, per PyThaiNLP's `corpus_license.md` |

These files are data. `npm run words:candidates` reads them to choose the real one-syllable words
the game can draw; see `tools/words/`. Keep them as they are, so the list of candidates can be
computed again from the same input.
