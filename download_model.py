import nltk
import gensim.downloader

if __name__ == '__main__':
    nltk.download('treebank', download_dir='data')
    nltk.download('punkt', download_dir="data")
    nltk.download('brown', download_dir="data")
    nltk.download('stopwords', download_dir="data")
    nltk.download('averaged_perceptron_tagger', download_dir="data")
    model = gensim.downloader.load('word2vec-google-news-300')
    model.save('data/word2vec.wordvectors')
