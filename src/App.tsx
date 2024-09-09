import { useState, useEffect } from "react";

// components
import Header from "./components/Header";
import MainApp from "./components/MainApp";
import Footer from "./components/Footer";
import Notification, { infoToast } from "./components/Notification";
import WalletContextProvider from "./components/WalletContextProvider";

export type SolanaNetworkType = "mainnet-beta" | "devnet";

function App() {
    const [solanaNetwork, setSolanaNetwork] =
        useState<SolanaNetworkType>("devnet");

    useEffect(() => {
        if (solanaNetwork) {
            infoToast(
                `App is using Solana ${
                    solanaNetwork === "mainnet-beta" ? "Mainnet" : "Devnet"
                }`
            );
        }
    }, [solanaNetwork]);

    return (
        <div className="app bg-bg-picture bg-cover bg-opacity-5 bg-slate-400">
            <WalletContextProvider solanaNetwork={solanaNetwork}>
                <Notification />

                <Header
                    solanaNetwork={solanaNetwork}
                    setSolanaNetwork={setSolanaNetwork}
                />
                <MainApp solanaNetwork={solanaNetwork} />
                <Footer />
            </WalletContextProvider>
        </div>
    );
}

export default App;
