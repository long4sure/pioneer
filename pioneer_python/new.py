import random

print("THIS IS A NUMBER GUESSING GAME")
name = input("What is your name? ")
print(f"Hi {name}, goodluck!")

num = random.randint(1,100)

print("Now you have to guess a number ranging from 1-100")

guessnum = int(input("Enter how many guesses you would like: "))

while guessnum > 0:
    guess = int(input("Type your guess: "))

    if guess > num:
        print("Lower")
    elif guess < num:
        print("Higher")
    else:
        print(f"You got it! The random number is {num}!")
        break
    
    guessnum -= 1

if guessnum == 0:
    print("You are out of guesses")
    
    