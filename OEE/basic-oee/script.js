// SAMPLE DATA (TEMPORARY)

const data = {

filling:{
    util:85,
    rft:92,
    oee:78,
    elor:6,
    avail:90,
    perf:87
},

milling:{
    util:80,
    rft:88,
    oee:74,
    elor:5,
    avail:85,
    perf:82
},

mixing:{
    util:83,
    rft:90,
    oee:76,
    elor:7,
    avail:88,
    perf:84
},

tinting:{
    util:79,
    rft:86,
    oee:72,
    elor:8,
    avail:84,
    perf:80
}

}


// DISPLAY VALUES

function showData(){

document.getElementById("fill_util").innerText=data.filling.util+"%";
document.getElementById("fill_rft").innerText=data.filling.rft+"%";
document.getElementById("fill_oee").innerText=data.filling.oee+"%";
document.getElementById("fill_elor").innerText=data.filling.elor+"%";
document.getElementById("fill_avail").innerText=data.filling.avail+"%";
document.getElementById("fill_perf").innerText=data.filling.perf+"%";

document.getElementById("mill_util").innerText=data.milling.util+"%";
document.getElementById("mill_rft").innerText=data.milling.rft+"%";
document.getElementById("mill_oee").innerText=data.milling.oee+"%";
document.getElementById("mill_elor").innerText=data.milling.elor+"%";
document.getElementById("mill_avail").innerText=data.milling.avail+"%";
document.getElementById("mill_perf").innerText=data.milling.perf+"%";

document.getElementById("mix_util").innerText=data.mixing.util+"%";
document.getElementById("mix_rft").innerText=data.mixing.rft+"%";
document.getElementById("mix_oee").innerText=data.mixing.oee+"%";
document.getElementById("mix_elor").innerText=data.mixing.elor+"%";
document.getElementById("mix_avail").innerText=data.mixing.avail+"%";
document.getElementById("mix_perf").innerText=data.mixing.perf+"%";

document.getElementById("tint_util").innerText=data.tinting.util+"%";
document.getElementById("tint_rft").innerText=data.tinting.rft+"%";
document.getElementById("tint_oee").innerText=data.tinting.oee+"%";
document.getElementById("tint_elor").innerText=data.tinting.elor+"%";
document.getElementById("tint_avail").innerText=data.tinting.avail+"%";
document.getElementById("tint_perf").innerText=data.tinting.perf+"%";

calculateAverage()

}



// CALCULATE AVERAGE

function calculateAverage(){

let util=(data.filling.util+data.milling.util+data.mixing.util+data.tinting.util)/4
let rft=(data.filling.rft+data.milling.rft+data.mixing.rft+data.tinting.rft)/4
let oee=(data.filling.oee+data.milling.oee+data.mixing.oee+data.tinting.oee)/4
let elor=(data.filling.elor+data.milling.elor+data.mixing.elor+data.tinting.elor)/4
let avail=(data.filling.avail+data.milling.avail+data.mixing.avail+data.tinting.avail)/4
let perf=(data.filling.perf+data.milling.perf+data.mixing.perf+data.tinting.perf)/4

document.getElementById("avg_util").innerText=util.toFixed(2)+"%"
document.getElementById("avg_rft").innerText=rft.toFixed(2)+"%"
document.getElementById("avg_oee").innerText=oee.toFixed(2)+"%"
document.getElementById("avg_elor").innerText=elor.toFixed(2)+"%"
document.getElementById("avg_avail").innerText=avail.toFixed(2)+"%"
document.getElementById("avg_perf").innerText=perf.toFixed(2)+"%"

}



showData()