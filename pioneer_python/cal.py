print("SIMPLE CALCULATOR")

num1 = int(input(f"1st number: "))
operation = input(f"Enter * , / , + , -")
num2 = int(input(f"2nd number: "))

if operation == "*":
    print(num1 * num2)
elif operation == "+":
    print(num1 + num2)
elif operation == "-":
    print(num1 - num2)
elif operation == "/":
    if num2 == 0:
        print("INVALID OPERATION")
    else:
        print(num1 - num2)
else:
    ("insvalid")