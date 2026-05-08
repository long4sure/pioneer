function calculate(){

let loading = Number(document.getElementById("loading_time").value)

let breaktime = Number(document.getElementById("breaktime").value)
let changeover = Number(document.getElementById("changeover").value)
let maintenance = Number(document.getElementById("maintenance").value)

let ideal_rate = Number(document.getElementById("ideal_rate").value)

let total_output = Number(document.getElementById("total_output").value)
let reject = Number(document.getElementById("reject_output").value)

let downtime = breaktime + changeover + maintenance

let uptime = loading - downtime

let availability = (uptime/loading)*100

let actual_rate = total_output / uptime

let performance = (actual_rate / ideal_rate) * 100

let good_output = total_output - reject

let quality = (good_output / total_output) * 100

let oee = (availability/100)*(performance/100)*(quality/100)*100

document.getElementById("availability").innerText = availability.toFixed(2)+"%"
document.getElementById("performance").innerText = performance.toFixed(2)+"%"
document.getElementById("quality").innerText = quality.toFixed(2)+"%"
document.getElementById("oee").innerText = oee.toFixed(2)+"%"

}
