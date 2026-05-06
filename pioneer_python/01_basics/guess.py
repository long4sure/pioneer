
import random

player = input("Hi! What is your name? ")
print(f"Welcome to the GUESSING GAME {player}!")
print("You just have to take a guess between numbers 1-100!")

random_number = random.randint(1,100)
number_of_guess = 10

print(f"You have a total of {number_of_guess} guesses! Goodluck, {player}!")
while number_of_guess > 0:
    
    guess = int(input(f"Now whats your guess {player}? "))
    
    if guess > random_number:
        print(f"Sorry {player} it must be lower than that! Try again.")
    elif guess < random_number:
        print(f"Sorry {player} it must be higher than that! Try again.")
    else:
        print(f"WOW {player} YOU NAILED IT! The number is {random_number}")
        break
    number_of_guess -= 1

if number_of_guess == 0:
    print(f"OH NO {player} YOU RAN OUT OF GUESSES! The random number is {random_number}")


print("SIMPLE CALCULATOR")

num1 = int(input("Your 1st number: "))
operation = input("Choose in the following * , - , + , /: ")
num2 = int(input("Your 2nd number: "))


if operation == "*":
    print(num1 * num2)
elif operation == "-":
    print(num1 - num2)
elif operation == "+":
    print(num1 + num2)
elif operation == "/":
    if num2 != 0:
        print(num1 / num2)
    else:
        print("Invalid Operations")
        

# Personal Digital Diary
# Save your thoughts, read them later!

import datetime
import os

DIARY_FILE = "my_diary.txt"

def write_entry():
    """Write a new diary entry"""
    print("\n📝 New Entry")
    print("-" * 30)
    
    # Get the entry
    entry = input("What's on your mind? ")
    
    # Get timestamp
    now = datetime.datetime.now()
    timestamp = now.strftime("%Y-%m-%d %I:%M %p")
    
    # Save to file
    with open(DIARY_FILE, "a") as file:  # "a" means append (add to end)
        file.write(f"\n[{timestamp}]\n")
        file.write(f"{entry}\n")
        file.write("-" * 30 + "\n")
    
    print("✅ Entry saved!")

def read_entries():
    """Read all diary entries"""
    print("\n📖 Your Diary Entries")
    print("=" * 50)
    
    # Check if file exists
    if not os.path.exists(DIARY_FILE):
        print("No entries yet. Write your first one!")
        return
    
    # Read and display entries
    with open(DIARY_FILE, "r") as file:
        content = file.read()
        print(content if content else "Your diary is empty.")
    
    input("\nPress Enter to continue...")

def search_entries():
    """Search entries for a keyword"""
    print("\n🔍 Search Entries")
    print("-" * 30)
    
    if not os.path.exists(DIARY_FILE):
        print("No entries to search.")
        return
    
    keyword = input("Enter search word: ").lower()
    
    with open(DIARY_FILE, "r") as file:
        entries = file.read().split("-" * 30)
    
    found = False
    for entry in entries:
        if keyword in entry.lower():
            print("\n" + entry.strip())
            print("-" * 30)
            found = True
    
    if not found:
        print(f"No entries containing '{keyword}'")
    
    input("\nPress Enter to continue...")

def count_entries():
    """Count total entries"""
    if not os.path.exists(DIARY_FILE):
        print("No entries yet.")
        return
    
    with open(DIARY_FILE, "r") as file:
        content = file.read()
        entries = content.split("-" * 30)
        # Subtract 1 because split creates empty first/last sometimes
        count = len([e for e in entries if e.strip()])
    
    print(f"\n📊 Total entries: {count}")
    input("\nPress Enter to continue...")

def show_menu():
    """Display the main menu"""
    while True:
        print("\n" + "=" * 40)
        print("     📔 DIGITAL DIARY MENU")
        print("=" * 40)
        print("1. 📝 Write new entry")
        print("2. 📖 Read all entries")
        print("3. 🔍 Search entries")
        print("4. 📊 Count entries")
        print("5. 🚪 Exit")
        print("=" * 40)
        
        choice = input("Choose an option (1-5): ")
        
        if choice == "1":
            write_entry()
        elif choice == "2":
            read_entries()
        elif choice == "3":
            search_entries()
        elif choice == "4":
            count_entries()
        elif choice == "5":
            print("👋 Goodbye! Keep writing!")
            break
        else:
            print("❌ Invalid choice. Try again!")

# Start the program
if __name__ == "__main__":
    print("🌟 Welcome to Your Personal Diary! 🌟")
    show_menu()