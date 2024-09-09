import { useEffect, useState } from "react";
import { Transaction, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";

import { Program, AnchorProvider } from "@project-serum/anchor";
import { Idl } from "@project-serum/anchor/dist/cjs/idl";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { successToast, errorToast, loadingToast } from "../Notification";
import { SolanaNetworkType } from "../../App";
import * as anchor from "@project-serum/anchor";
import { checkTransactionConfirmation, constants } from "../../utils/general";
import idl from "../../utils/idl.json";
import { token } from "@project-serum/anchor/dist/cjs/utils";

interface MainProps {
    solanaNetwork: SolanaNetworkType;
}

interface StakeData {
    reward_rate: number,
    lock_period: number,
    total_amount: number,
    lock_amount: number,
    admin: PublicKey
}

interface UserData {
    stakeDate: number,
    stakeAmount: number,
    previousStakeReward: number,
    currentTokenAmount: number
}

const programID = new PublicKey(idl.metadata.address);
const stakeToken = new PublicKey(constants.stakeToken);
const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
})


export default function MainApp({ solanaNetwork }: MainProps) {
    const { connection } = useConnection();
    const { publicKey, wallet, signTransaction, signAllTransactions } = useWallet();
    const getProvider = () => {
        if (!wallet || !publicKey || !signTransaction || !signAllTransactions) {
            return;
        }
        const signerWallet = {
            publicKey: publicKey,
            signTransaction: signTransaction,
            signAllTransactions: signAllTransactions,
        };

        const provider = new AnchorProvider(connection, signerWallet, {
            preflightCommitment: "recent",
        });

        return provider;
    };

    const fetchStakeData = async () => {
        const provider = getProvider();
        if (!provider) return;
        const program = new Program(idl as Idl, programID, provider);
        const adminState = PublicKey.findProgramAddressSync([Buffer.from("state"), Buffer.from("admin")], program.programId)[0];
        try {
            const data = await program.account.adminState.fetch(adminState);
            if (data) {
                setStakeData({ reward_rate: Number(data.rewardRate), lock_period: Number(data.lockPeriod), total_amount: Number(data.totalAmount), admin: new PublicKey(data.admin), lock_amount: Number(data.locked_amount) });
            }
        }
        catch (err) {
            console.log(err);
        }
    }

    const fetchUserData = async () => {
        const provider = getProvider();
        if (!publicKey || !provider) return;
        const stakerDepositTokenAccount = await getAssociatedTokenAddress(stakeToken, publicKey, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
        const tokenInfo = await provider.connection.getTokenAccountBalance(stakerDepositTokenAccount);
        console.log(tokenInfo.value.uiAmount)
        const program = new Program(idl as Idl, programID, provider);
        const userState = PublicKey.findProgramAddressSync([Buffer.from("state"), Buffer.from("user"), publicKey.toBuffer()], program.programId)[0];
        try {
            const data = await program.account.userState.fetch(userState);
            if (data) {
                setUserData({ stakeDate: Number(data.stakeDate), stakeAmount: Number(data.stakeAmount), previousStakeReward: Number(data.previousStakeReward), currentTokenAmount: tokenInfo.value.uiAmount||0 });
            }
        }
        catch (err) {
            console.log(err);
        }

    }

    const [isBusy, setIsBusy] = useState(false);
    const [userData, setUserData] = useState<UserData>({ stakeDate: 0, stakeAmount: 0, previousStakeReward: 0, currentTokenAmount: 0 });
    const [stakeData, setStakeData] = useState<StakeData>({ reward_rate: 0, lock_period: 0, total_amount: 0, admin: new PublicKey(constants.admin), lock_amount: 0 });
    const [refreshCount, setRefreshCount] = useState<number>(0);
    const [stakingAmount, setStakingAmount] = useState<number | string>("");
    const [transactionSignature, setTransactionSignature] = useState<{
        message: string;
        link: string;
    } | null>(null);

    useEffect(() => {
        fetchStakeData();
        fetchUserData();
    }, [publicKey]);

    useEffect(() => {
        if (transactionSignature) {
            setTimeout(() => {
                setTransactionSignature(null);
            }, 15000);
        }
    }, [transactionSignature]);

    const resetInputs = () => {
        setStakingAmount("");
    };

    const handleRefresh = () => {
        resetInputs();
        setRefreshCount((prevState) => prevState + 1);
    };

    // function to handle button click
    const stakeTokenHandler = async () => {
        try {
            if (!publicKey) {
                errorToast("No wallet connected!");
                return;
            }

            if (!stakingAmount) {
                errorToast("No staking amount entered!");
                return;
            }

            if (Number(stakingAmount) <= 0) {
                errorToast("Invalid amount! Should be greater than 0");
                return;
            }
            setIsBusy(true);
            const provider = getProvider(); //checks & verify the dapp it can able to connect solana network
            if (!provider || !publicKey || !signTransaction) return;
            const program = new Program(idl as Idl, programID, provider);
            const userState = PublicKey.findProgramAddressSync([Buffer.from("state"), Buffer.from("user"), publicKey.toBuffer()], program.programId)[0];
            const adminState = PublicKey.findProgramAddressSync([Buffer.from("state"), Buffer.from("admin")], program.programId)[0];
            const vault = PublicKey.findProgramAddressSync([Buffer.from("vault"), stakeToken.toBuffer()], program.programId)[0];
            const stakerDepositTokenAccount = await getAssociatedTokenAddress(stakeToken, publicKey, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

            loadingToast(`Staking ${stakingAmount} Token`);

            const tx = await program.transaction.stake(
                new anchor.BN(Number(stakingAmount) * 1000000), {
                accounts: {
                    staker: publicKey,
                    adminState,
                    stakeToken,
                    vault,
                    stakerDepositTokenAccount,
                    userState,
                    systemProgram: SystemProgram.programId,
                    rent: SYSVAR_RENT_PUBKEY,
                    tokenProgram: TOKEN_PROGRAM_ID
                }
            }
            );
            const transaction = new Transaction();
            transaction.add(tx);
            transaction.feePayer = provider.wallet.publicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
            const signedTx = await provider.wallet.signTransaction(transaction);
            const txId = await connection.sendRawTransaction(signedTx.serialize());
            const isConfirmed = await checkTransactionConfirmation(connection, txId);

            if (isConfirmed) {
                successToast(`Staked ${stakingAmount} Token successfully!`);
            } else {
                errorToast(
                    `Couldn't confirm transaction! Please check on Solana Explorer`
                );
            }
            setTransactionSignature({
                link: `https://explorer.solana.com/tx/${txId}?cluster=${solanaNetwork}`,
                message: `You can view your transaction on the Solana Explorer at:\n`,
            });
            fetchUserData();
            fetchStakeData()
            setIsBusy(false);
            handleRefresh();
        } catch (error) {
            setIsBusy(false);
            handleRefresh();
            errorToast("Something went wrong while sending Tokens!");
            console.error("solSendHandler => ", error);
        }
    };

    const getRewardHandler = async () => {
        try {
            if (!publicKey) {
                errorToast("No wallet connected!");
                return;
            }
            if (userData.stakeAmount === 0) {
                errorToast("Plz Stake before that");
                return;
            }
            setIsBusy(true);
            const provider = getProvider(); //checks & verify the dapp it can able to connect solana network
            if (!provider || !publicKey || !signTransaction) return;
            const program = new Program(idl as Idl, programID, provider);
            const userState = PublicKey.findProgramAddressSync([Buffer.from("state"), Buffer.from("user"), publicKey.toBuffer()], program.programId)[0];
            const adminState = PublicKey.findProgramAddressSync([Buffer.from("state"), Buffer.from("admin")], program.programId)[0];
            const vault = PublicKey.findProgramAddressSync([Buffer.from("vault"), stakeToken.toBuffer()], program.programId)[0];
            const stakerDepositTokenAccount = await getAssociatedTokenAddress(stakeToken, publicKey, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
            const adminDepositTokenAccount = await getAssociatedTokenAddress(stakeToken, stakeData.admin, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
            loadingToast(`Rewarding Tokens`);
            const tx = await program.transaction.getReward({
                accounts: {
                    staker: publicKey.toString(),
                    admin: stakeData.admin.toString(),
                    adminState,
                    stakeToken,
                    vault,
                    stakerDepositTokenAccount,
                    adminDepositTokenAccount,
                    userState,
                    tokenProgram: TOKEN_PROGRAM_ID
                }
            }
            );
            const transaction = new Transaction();
            transaction.add(tx);
            transaction.feePayer = provider.wallet.publicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
            const signedTx = await provider.wallet.signTransaction(transaction);
            const txId = await connection.sendRawTransaction(signedTx.serialize());
            const isConfirmed = await checkTransactionConfirmation(connection, txId);

            if (isConfirmed) {
                successToast(`Get Reward Tokens successfully!`);
            } else {
                errorToast(
                    `Couldn't confirm transaction! Please check on Solana Explorer`
                );
            }
            setTransactionSignature({
                link: `https://explorer.solana.com/tx/${txId}?cluster=${solanaNetwork}`,
                message: `You can view your transaction on the Solana Explorer at:\n`,
            });
            fetchUserData();
            fetchStakeData()
            setIsBusy(false);
            handleRefresh();
        } catch (error) {
            setIsBusy(false);
            handleRefresh();
            errorToast("Something went wrong while sending Tokens!");
            console.error("solSendHandler => ", error);
        }
    }

    const unStakeHandler = async () => {
        try {
            if (!publicKey) {
                errorToast("No wallet connected!");
                return;
            }
            setIsBusy(true);
            const provider = getProvider(); //checks & verify the dapp it can able to connect solana network
            if (!provider || !publicKey || !signTransaction) return;
            const program = new Program(idl as Idl, programID, provider);
            const userState = PublicKey.findProgramAddressSync([Buffer.from("state"), Buffer.from("user"), publicKey.toBuffer()], program.programId)[0];
            const adminState = PublicKey.findProgramAddressSync([Buffer.from("state"), Buffer.from("admin")], program.programId)[0];
            const vault = PublicKey.findProgramAddressSync([Buffer.from("vault"), stakeToken.toBuffer()], program.programId)[0];
            const stakerDepositTokenAccount = await getAssociatedTokenAddress(stakeToken, publicKey, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
            const adminDepositTokenAccount = await getAssociatedTokenAddress(
                stakeToken,
                stakeData.admin,
                true,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            );
            loadingToast(`Unstaking Tokens`);
            const tx = await program.transaction.unstake({
                accounts: {
                    staker: publicKey.toString(),
                    admin: stakeData.admin.toString(),
                    adminState,
                    stakeToken,
                    vault,
                    stakerDepositTokenAccount,
                    adminDepositTokenAccount,
                    userState,
                    tokenProgram: TOKEN_PROGRAM_ID
                }
            }
            );
            const transaction = new Transaction();
            transaction.add(tx);
            transaction.feePayer = provider.wallet.publicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
            const signedTx = await provider.wallet.signTransaction(transaction);
            const txId = await connection.sendRawTransaction(signedTx.serialize());
            const isConfirmed = await checkTransactionConfirmation(connection, txId);

            if (isConfirmed) {
                successToast(`Unstake Tokens successfully!`);
            } else {
                errorToast(
                    `Couldn't confirm transaction! Please check on Solana Explorer`
                );
            }
            setTransactionSignature({
                link: `https://explorer.solana.com/tx/${txId}?cluster=${solanaNetwork}`,
                message: `You can view your transaction on the Solana Explorer at:\n`,
            });
            fetchUserData();
            fetchStakeData()
            setIsBusy(false);
            handleRefresh();
        } catch (error: any) {
            setIsBusy(false);
            handleRefresh();
            if (Math.floor((Date.now() / 1000) - userData.stakeDate) / 1000 < stakeData.lock_period) {
                errorToast("You can't unstake during Lock Period.");
                return;
            }
            else {
                errorToast("Something went wrong while receiving Tokens!");
            }


        }
    }

    return (
        <main className="main flex justify-center">
            <div className="w-[80vw]">
                <h1 className="heading-1 my-4 sm:px-4 text-4xl">
                    Welcome to Our Platform!
                </h1>
                <h2 className="heading-1 my-4 sm:px-3 text-xl">
                    Our Platfrom will give the rich rewards for staker.<br /> Let's enjoy and get passive Income.
                </h2>
                {publicKey ? (
                    <div className="my-4">
                        <div className="flex justify-between items-center flex-wrap my-8  h-40 flex-row gap-10 font-semibold">
                            <div className="text-white px-8 py-8 bg-[#1f293766] rounded-3xl border-[1px] border-[#ffffff66] h-32 w-60 text-[14px] flex flex-col justify-center">
                                <div><span className="font-semibold">Staked Amounts:</span> {userData?.stakeAmount / 1e6}</div>
                                <div><span className="font-semibold">Stakable Amounts:</span> {userData?.currentTokenAmount}</div>
                                Staked Date:<br /> {(userData?.stakeDate && userData?.stakeAmount > 0) ? formatter.format(new Date(userData?.stakeDate * 1000)) : undefined}<br />
                                Current Reward: {parseFloat(((userData.previousStakeReward +
                                    userData.stakeAmount * stakeData.reward_rate * (Math.floor(Date.now() / 1000) - userData.stakeDate) / (stakeData.lock_period * 1000)
                                ) / 1e6).toFixed(3))}
                            </div>
                            <div className="text-white px-8 py-8 bg-[#1f293766] rounded-3xl border-[1px] border-[#ffffff66] h-32 w-60 text-[14px] flex flex-col justify-center">
                                Reward Rate: {stakeData.reward_rate} % <br />
                                Lock Period: {parseFloat((stakeData.lock_period / 60).toFixed(3))} min
                            </div>
                            <div className="text-white px-8 py-8 bg-[#1f293766] rounded-3xl border-[1px] border-[#ffffff66] h-32 w-60 text-[14px] flex flex-col justify-center">
                                Total Staked Amount: {parseFloat((stakeData?.total_amount / 1e6).toFixed(3))}<br />
                                Locked Amount: {parseFloat((stakeData?.total_amount / 1e6).toFixed(3))}<br />
                            </div>
                        </div>
                        <div className="flex flex-col flex-wrap my-8 gap-4 w-[420px] mx-auto">
                            <div className="flex items-center justify-between w-[420px]">
                                <input className="w-[100px] h-10 px-4 rounded-md" type="number" placeholder="Enter amount to be stake"
                                    value={Number(stakingAmount)} onChange={(event) => { setStakingAmount(Number(event.target.value)); }} min={0}
                                />
                                <button type="button" className="button w-40 bg-gradient-to-r from-[#1ddaff] to-[#ea1af7] rounded-md text-lg px-4 py-2" onClick={stakeTokenHandler} disabled={isBusy}>
                                    Stake
                                </button>
                            </div>
                            <div className="w-[420px] flex justify-between mt-8">
                                <button type="button" className="button w-40 bg-gradient-to-r from-[#1ddaff] to-[#ea1af7] rounded-md text-lg px-4 py-2" onClick={getRewardHandler} disabled={isBusy}>
                                    Get Reward
                                </button>
                                <button type="button" className="button w-40 bg-gradient-to-r from-[#1ddaff] to-[#ea1af7] rounded-md text-lg px-4 py-2" onClick={unStakeHandler} disabled={isBusy}>
                                    Unstake
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-secondary text-xl text-center mt-20">
                        Please connect wallet to use the app.
                    </p>
                )}
            </div>
        </main>
    );
}
