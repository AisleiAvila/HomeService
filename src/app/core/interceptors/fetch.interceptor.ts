// export function applyFetchInterceptor() {
//   const originalFetch = window.fetch;

//   window.fetch = async (input, init) => {
//     let url: string;
//     let newInput = input;

//     if (typeof input === "string") {
//       url = input.trim();
//       newInput = url;
//     } else if (input instanceof Request) {
//       url = input.url.trim();
//       newInput = new Request(url, input);
//     } else {
//       return originalFetch(input, init);
//     }

//     // Corrige a URL problemática
//     if (url.includes("/auth/v1/token?grant_type=password")) {
//       let newUrl = url.replace("?grant_type=password", "").trim();
//       newUrl = newUrl.trim();
//       const newInit = { ...init };

//       if (init?.body && typeof init.body === "string") {
//         try {
//           const body = JSON.parse(init.body);
//           body.grant_type = "password"; // Adiciona no corpo
//           newInit.body = JSON.stringify(body);
//         } catch (e) {
//           // Ignora se não for JSON
//         }
//       }

//       newUrl = newUrl.replace(/\s+$/, "");
//       newUrl = newUrl.trim();

//       console.log("FetchInterceptor - Modified URL:", JSON.stringify(newUrl));
//       return originalFetch(newUrl, newInit);
//     }

//     console.log("FetchInterceptor - Original Input:", JSON.stringify(newInput));
//     return originalFetch(newInput, init);
//   };
// }
