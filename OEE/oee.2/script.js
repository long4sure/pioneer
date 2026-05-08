const availTime = 480; // Assuming 8-hour shift, change as needed

function calculate() {
    // 1. Sum up Planned/Uncontrollable (A + UDT)
    let totalPlanned = 0;
    document.querySelectorAll('.calc-planned').forEach(input => {
        totalPlanned += Number(input.value) || 0;
    });
    document.getElementById('totalUncontrollable').value = totalPlanned;

    // 2. Loading Time = Available - Planned/Uncon
    let loadingTime = availTime - totalPlanned;
    document.getElementById('loadingTimeDisplay').innerText = loadingTime;

    // 3. Sum up Unplanned (B-codes + Idling)
    let totalUnplanned = 0;
    document.querySelectorAll('.calc-unplanned').forEach(input => {
        totalUnplanned += Number(input.value) || 0;
    });
    document.getElementById('totalUnplanned').value = totalUnplanned;

    // 4. Final Uptime = Loading Time - Unplanned
    let finalUptime = loadingTime - totalUnplanned;
    document.getElementById('uptimeDisplay').innerText = finalUptime;
}

// Add event listener to all inputs for real-time calculation
document.addEventListener('input', calculate);