/**
 * QuizManager handles transforming flashcards into playable quizzes.
 */
class QuizManager {
    constructor(game, flashcardManager, apiBaseUrl) {
        this.game = game;
        this.flashcardManager = flashcardManager;
        this.apiBaseUrl = apiBaseUrl;
    }

    async startQuizFromFlashcards() {
        if (!this.flashcardManager.hasFlashcards()) {
            this.game.updateStatus('No flashcards available for quiz! Create some flashcards first.');
            return;
        }

        try {
            const quizFlashcards = this.flashcardManager.getRandomFlashcards(5);

            if (quizFlashcards.length === 0) {
                this.game.updateStatus('No flashcards available for quiz!');
                return;
            }

            const questions = await this.generateMultipleChoiceQuestions(quizFlashcards);
            this.showQuizModal(questions);
        } catch (error) {
            console.error('Error creating quiz:', error);
            this.game.updateStatus('Error creating quiz. Please try again.');
        }
    }

    async generateMultipleChoiceQuestions(flashcards) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/generate-quiz`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ flashcards })
            });

            if (!response.ok) {
                throw new Error('Failed to generate quiz');
            }

            const data = await response.json();
            return data.questions || [];
        } catch (error) {
            console.error('Error generating AI quiz:', error);
            return this.generateSimpleQuestions(flashcards);
        }
    }

    generateSimpleQuestions(flashcards) {
        const questions = [];

        flashcards.forEach(flashcard => {
            const baseQuestion = {
                question: flashcard.front,
                correctAnswer: flashcard.back,
                options: [flashcard.back]
            };

            const otherFlashcards = this.flashcardManager.flashcards.filter(card => card !== flashcard);
            const shuffled = [...otherFlashcards].sort(() => Math.random() - 0.5);

            shuffled.slice(0, 3).forEach(card => {
                baseQuestion.options.push(card.back);
            });

            const deduped = [...new Set(baseQuestion.options)];
            baseQuestion.options = deduped.slice(0, 4).sort(() => Math.random() - 0.5);

            questions.push(baseQuestion);
        });

        return questions;
    }

    showQuizModal(questions) {
        const modal = document.getElementById('quizModal');
        const questionElement = document.getElementById('quizQuestion');
        const optionsElement = document.getElementById('quizOptions');
        const resultElement = document.getElementById('quizResult');
        const scoreElement = document.getElementById('quizScore');

        if (!modal || !questionElement || !optionsElement || !resultElement || !scoreElement) {
            console.warn('Quiz modal elements missing');
            return;
        }

        resultElement.style.display = 'none';
        scoreElement.style.display = 'none';

        let currentIndex = 0;
        let score = 0;
        let selectedAnswer = null;

        const showQuestion = () => {
            if (currentIndex >= questions.length) {
                showScore();
                return;
            }

            const currentQuestion = questions[currentIndex];
            questionElement.textContent = `Question ${currentIndex + 1}: ${currentQuestion.question}`;

            optionsElement.innerHTML = '';
            currentQuestion.options.forEach(option => {
                const optionElement = document.createElement('div');
                optionElement.className = 'quiz-option';
                optionElement.textContent = option;
                optionElement.addEventListener('click', () => selectAnswer(option, optionElement));
                optionsElement.appendChild(optionElement);
            });
        };

        const selectAnswer = (answer, element) => {
            optionsElement.querySelectorAll('.quiz-option').forEach(opt => opt.classList.remove('selected'));
            element.classList.add('selected');
            selectedAnswer = answer;

            setTimeout(showResult, 500);
        };

        const showResult = () => {
            const currentQuestion = questions[currentIndex];
            const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

            if (isCorrect) {
                score++;
            }

            optionsElement.querySelectorAll('.quiz-option').forEach(opt => {
                if (opt.textContent === currentQuestion.correctAnswer) {
                    opt.classList.add('correct');
                } else if (opt.textContent === selectedAnswer && !isCorrect) {
                    opt.classList.add('incorrect');
                }
            });

            resultElement.textContent = isCorrect
                ? 'Correct! 🎉'
                : `Incorrect. The correct answer is: ${currentQuestion.correctAnswer}`;
            resultElement.className = `quiz-result ${isCorrect ? 'correct' : 'incorrect'}`;
            resultElement.style.display = 'block';

            setTimeout(() => {
                currentIndex++;
                showQuestion();
            }, 2000);
        };

        const showScore = () => {
            questionElement.textContent = 'Quiz Complete!';
            optionsElement.innerHTML = '';
            resultElement.style.display = 'none';

            const percentage = Math.round((score / questions.length) * 100);
            scoreElement.innerHTML = `
                <div>Your Score: ${score}/${questions.length}</div>
                <div>Percentage: ${percentage}%</div>
                <div>${percentage >= 80 ? 'Excellent! 🌟' : percentage >= 60 ? 'Good job! 👍' : 'Keep studying! 📚'}</div>
            `;
            scoreElement.style.display = 'block';
        };

        showQuestion();
        modal.style.display = 'flex';

        const closeButton = document.getElementById('closeQuizModal');
        if (closeButton) {
            closeButton.onclick = () => {
                modal.style.display = 'none';
            };
        }

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }
}
