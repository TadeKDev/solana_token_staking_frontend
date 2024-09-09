import React from "react";

interface LoadingSkeletonProps {
    width?: string;
    height?: string;
}

export default function LoadingSkeleton({
    width = "100%",
    height = "1.5rem",
}: LoadingSkeletonProps) {
    return (
        <div
            style={{ width, height }}
            className="animate-pulse bg-gray-500 rounded-sm"
        />
    );
}
