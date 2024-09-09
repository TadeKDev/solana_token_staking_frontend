import React from "react";
import { Toaster, toast } from "react-hot-toast";

export default function Notification() {
    return <Toaster position="top-center" reverseOrder={true} />;
}

const duration = 5000;

const successToast = (message: string) => {
    toast.remove();
    toast.success(message, { duration });
};

const errorToast = (message: string) => {
    toast.remove();
    toast.error(message, { duration });
};

const infoToast = (message: string) => {
    toast.remove();
    toast(message, {
        icon: <i className="bi bi-info-circle-fill text-sky-500" />,
        duration,
    });
};

const loadingToast = (message: string) => {
    toast.remove();
    toast.loading(message);
};

export { successToast, errorToast, infoToast, loadingToast };
