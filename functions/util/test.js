


const espera = (ms) => new Promise(resolve => setTimeout(resolve, ms));

//espera(5000).then(() => console.log('Hola'));

const esp = async () => {
    const e = await espera(5000);
    console.log(e);
}

esp();