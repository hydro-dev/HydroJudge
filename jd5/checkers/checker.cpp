#include <fstream>
#include <cstring>
using namespace std;
int score, result, message;
int main() {
    ifstream usr("usrout");
    ofstream opt("message");
    if (!usr) {
        opt << "Cannot open contestant\'s output file" << endl;
        return 8;
    }
    ifstream std("stdout");
    if (!std) {
        opt << "Cannot open standard output file" << endl;
        return 8;
    }
    char ch1 = '\n', ch2 = '\n';
    char str1[20], str2[20];
    int flag1, flag2;
    while (true) {
        if (ch1 == '\n' || ch1 == '\r' || ch1 == EOF) {
            if (ch1 == '\r') {
                usr >> ch1;
                if (ch1 == '\n')
                    usr >> ch1;
            } else
                usr >> ch1;
            while (ch1 == ' ' || ch1 == '\t')
                usr >> ch1;
            flag1 = 2;
        } else if (ch1 == ' ' || ch1 == '\t') {
            while (ch1 == ' ' || ch1 == '\t')
                usr >> ch1;
            if (ch1 == '\n' || ch1 == '\r' || ch1 == EOF) {
                if (ch1 == '\r') {
                    usr >> ch1;
                    if (ch1 == '\n')
                        usr >> ch1;
                } else
                    usr >> ch1;
                while (ch1 == ' ' || ch1 == '\t')
                    usr >> ch1;
                flag1 = 2;
            } else
                flag1 = 1;
        } else
            flag1 = 0;
        if (ch2 == '\n' || ch2 == '\r' || ch2 == EOF) {
            if (ch2 == '\r') {
                std >> ch2;
                if (ch2 == '\n')
                    std >> ch2;
            } else
                std >> ch2;
            while (ch2 == ' ' || ch2 == '\t')
                std >> ch2;
            flag2 = 2;
        } else if (ch2 == ' ' || ch2 == '\t') {
            while (ch2 == ' ' || ch2 == '\t')
                std >> ch2;
            if (ch2 == '\n' || ch2 == '\r' || ch2 == EOF) {
                if (ch2 == '\r') {
                    std >> ch2;
                    if (ch2 == '\n')
                        std >> ch2;
                } else
                    std >> ch2;
                while (ch2 == ' ' || ch2 == '\t')
                    std >> ch2;
                flag2 = 2;
            } else
                flag2 = 1;
        } else
            flag2 = 0;
        if (flag1 != flag2) {
            opt << "Presentation error" << endl;
            return 2;
        }
        int len1 = 0;
        while (len1 < 10) {
            if (ch1 != ' ' && ch1 != '\t' && ch1 != '\n' && ch1 != '\r' && ch1 != EOF)
                str1[len1++] = ch1;
            else
                break;
            usr >> ch1;
        }
        str1[len1] = '\0';
        int len2 = 0;
        while (len2 < 10) {
            if (ch2 != ' ' && ch2 != '\t' && ch2 != '\n' && ch2 != '\r' && ch2 != EOF)
                str2[len2++] = ch2;
            else
                break;
            std >> ch2;
        }
        str2[len2] = '\0';
        if (len1 != len2 || strcmp(str1, str2) != 0) {
            opt << "Read " << str1 << " but expect " << str2;
            return 2;
        }
        if (ch1 == EOF && ch2 == EOF)
            break;
    }
    return 1;
}