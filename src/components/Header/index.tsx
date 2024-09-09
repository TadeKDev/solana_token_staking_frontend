import React, { useEffect, useState, useCallback } from "react";
import { SolanaNetworkType } from "../../App";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { infoToast } from "../Notification";
import { shortenAddress } from "../../utils/general";

interface HeaderProps {
    solanaNetwork: SolanaNetworkType;
    setSolanaNetwork: (value: SolanaNetworkType) => void;
}

export default function Header({
    solanaNetwork,
    setSolanaNetwork,
}: HeaderProps) {
    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const wallet = useWallet();

    useEffect(() => {
        if (wallet.publicKey) {
            setIsWalletConnected(true);
        } else {
            setIsWalletConnected(false);
        }
    }, [wallet]);

    useEffect(() => {
        if (isWalletConnected) {
            infoToast("Wallet connected!");
        } else {
            infoToast("Wallet disconnected!");
        }
    }, [isWalletConnected]);

    const renderWalletButton = () => {
        return (
            <WalletMultiButton className="bg-secondary hover:bg-[#15539a]" />
        );
    };

    const mobileMenuHandler = () => {
        setIsMobileMenuOpen((prevState) => !prevState);
    };

    const renderMobileMenuButton = () => {
        return (
            <button
                type="button"
                className="text-4xl text-secondary sm:hidden"
                onClick={mobileMenuHandler}
            >
                {isMobileMenuOpen ? (
                    <i className="bi bi-x-lg" />
                ) : (
                    <i className="bi bi-list" />
                )}
            </button>
        );
    };

    return (
        <header className="header">
            <div className="header-main">
                <p className="text-primary font-semibold text-3xl">
                 {" "}
                </p>

                {renderMobileMenuButton()}

                <div className="hidden sm:flex space-x-4">
                    <span className="text-secondary flex items-center">
                        <p
                            className={`text-lg mx-2 ${
                                solanaNetwork === "mainnet-beta" &&
                                "text-primary"
                            }`}
                        >
                            Mainnet
                        </p>
                        {solanaNetwork === "mainnet-beta" ? (
                            <i
                                className="bi bi-toggle-off text-3xl cursor-pointer hover:text-primary"
                                onClick={() => setSolanaNetwork("devnet")}
                            />
                        ) : (
                            <i
                                className="bi bi-toggle-on text-3xl cursor-pointer hover:text-primary"
                                onClick={() => setSolanaNetwork("mainnet-beta")}
                            />
                        )}
                        <p
                            className={`text-lg mx-2 ${
                                solanaNetwork === "devnet" && "text-primary"
                            }`}
                        >
                            Devnet
                        </p>
                    </span>
                    <span className="text-secondary flex items-center">
                        {renderWalletButton()}
                    </span>
                </div>
            </div>
            {isMobileMenuOpen && (
                <div className="header-mobile">
                    <span className="text-secondary flex items-center">
                        <p
                            className={`text-lg mx-2 ${
                                solanaNetwork === "mainnet-beta" &&
                                "text-primary"
                            }`}
                        >
                            Mainnet
                        </p>
                        {solanaNetwork === "mainnet-beta" ? (
                            <i
                                className="bi bi-toggle-off text-3xl cursor-pointer hover:text-primary"
                                onClick={() => setSolanaNetwork("devnet")}
                            />
                        ) : (
                            <i
                                className="bi bi-toggle-on text-3xl cursor-pointer hover:text-primary"
                                onClick={() => setSolanaNetwork("mainnet-beta")}
                            />
                        )}
                        <p
                            className={`text-lg mx-2 ${
                                solanaNetwork === "devnet" && "text-primary"
                            }`}
                        >
                            Devnet
                        </p>
                    </span>
                    <span className="text-secondary flex items-center">
                        {renderWalletButton()}
                    </span>
                </div>
            )}
        </header>
    );
}
