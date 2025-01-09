// Variables globales
let currentRequest = 1;
let totalRequests = 0;
let isCaptchaResolved = true;

// Fonction pour afficher le CAPTCHA
function showCaptcha(outputDiv, index) {
    return new Promise((resolve) => {
        console.log(`Affichage du CAPTCHA pour la séquence ${index}`);
        captchaContainer.style.display = 'block'; // Afficher le conteneur CAPTCHA
        AwsWafCaptcha.renderCaptcha(captchaContainer, {
            apiKey: apiKey,
            onSuccess: (wafToken) => {
                console.log(`CAPTCHA résolu avec succès pour la séquence ${index}`);
                captchaContainer.style.display = 'none'; // Cacher le conteneur CAPTCHA
                fetch(wafUrl, {
                    method: "POST",
                    headers: {
                        'Authorization': `Bearer ${wafToken}`,
                    }
                }).then(() => {
                    addOutputLine(outputDiv, `${index}. CAPTCHA Passed`);
                    resolve(true); // Continuer la séquence
                }).catch((error) => {
                    console.error('Erreur lors de la résolution du CAPTCHA :', error);
                    captchaContainer.style.display = 'none'; // Cacher le conteneur CAPTCHA
                    resolve(false); // Arrêter la séquence
                });
            },
            onError: (error) => {
                console.error('Erreur avec le CAPTCHA :', error);
                captchaContainer.style.display = 'none'; // Toujours cacher le CAPTCHA
                resolve(false); // Arrêter la séquence
            },
        });
    });
}
// Fonction pour effectuer une requête GET et afficher "Forbidden"
async function fetchAndDisplay(index) {
    if (!isCaptchaResolved) {
        console.log("En attente de la résolution du CAPTCHA...");
        return;
    }

    try {
        const response = await fetch("https://api.prod.jcloudify.com/whoami");
        if (response.status === 403) {
            const outputDiv = document.querySelector("#output");
            const line = document.createElement("div");
            line.textContent = `${index}. Forbidden`;
            outputDiv.appendChild(line);
        } else if (response.status === 200) {
            console.log("Accès autorisé, mais réponse inattendue");
        } else {
            console.error("Erreur API :", response.status);
        }
    } catch (error) {
        console.error("Erreur réseau :", error);
    }
}

// Fonction principale pour gérer la séquence
async function processSequence() {
    while (currentRequest <= totalRequests) {
        if (!isCaptchaResolved) {
            // Si CAPTCHA non résolu, on attend avant de continuer
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
        }

        await fetchAndDisplay(currentRequest);

        currentRequest++;

        // Temporisation de 1 seconde entre chaque requête
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("Séquence terminée !");
}

// Gestionnaire de soumission du formulaire
document.querySelector("#number-form").addEventListener("submit", (event) => {
    event.preventDefault();

    const input = document.querySelector("#number-input");
    const value = parseInt(input.value, 10);

    if (value < 1 || value > 1000) {
        alert("Veuillez entrer un nombre entre 1 et 1 000.");
        return;
    }

    totalRequests = value;
    currentRequest = 1;

    // Supprime le formulaire et affiche la sortie
    document.querySelector("#number-form").style.display = "none";
    document.querySelector("#output").innerHTML = "";

    // Démarre la séquence
    processSequence();
});

// Intercepte les erreurs CAPTCHA
window.addEventListener("captcha-required", () => {
    isCaptchaResolved = false;

    showMyCaptcha((wafToken) => {
        console.log("CAPTCHA résolu avec succès !");
        isCaptchaResolved = true;
    });
});