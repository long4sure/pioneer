import random

print("Hello, Python World!")
name = input("What's your name? ")
print(f"Nice to meet you, {name}!")

print(f"Lets play a guessing game {name}!")
print("Just guess the random number that ranges 1-100")


number = random.randint(1,100)
guess = int(input("How many guesses would you want? "))

print(f"Alright! Now you have {guess} guesses!")

while guess > 0:

    attempt = int(input(f"Now take a guess {name}:"))
    
    if attempt > number:
        print("Holy moly make it lower!")
    elif attempt < number:
        print("Holy moly make it higher!")
    else:
        print(f"Nice work! You guess the number {number}")
        break
    guess -= 1

if guess == 0:
    print(f"You run out of guesses {name}, the random number is {number}")