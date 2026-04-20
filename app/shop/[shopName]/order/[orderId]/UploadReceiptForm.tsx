'use client';

import { useState } from 'react';
import { Upload, Check, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

type InstallmentRef = {
    id: string;
    amount: number;
    createdAt: string;
    proofOfPayment?: string | null;
};

type Props = {
    orderId: string;
    shopName: string;
    paymentType?: string;
    saleProof?: string | null;
    installments?: InstallmentRef[];
};

function formatCurrency(n: number) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n);
}

async function postUpload(params: { orderId: string; installmentId?: string; file: File }) {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('orderId', params.orderId);
    if (params.installmentId) formData.append('installmentId', params.installmentId);

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
    }
    return response.json();
}

export default function UploadReceiptForm({
    orderId,
    paymentType = 'full',
    saleProof,
    installments = [],
}: Props) {
    const router = useRouter();

    if (paymentType === 'installment') {
        return (
            <InstallmentUpload
                orderId={orderId}
                installments={installments}
                onComplete={() => router.refresh()}
            />
        );
    }

    return <SingleUpload orderId={orderId} existingProof={saleProof} onComplete={() => router.refresh()} />;
}

function SingleUpload({
    orderId,
    existingProof,
    onComplete,
}: {
    orderId: string;
    existingProof?: string | null;
    onComplete: () => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        try {
            await postUpload({ orderId, file });
            toast.success('Receipt uploaded');
            setFile(null);
            onComplete();
        } catch (err: any) {
            toast.error(err.message || 'Failed to upload');
        } finally {
            setIsUploading(false);
        }
    };

    if (existingProof) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                    <Check className="w-4 h-4" /> Proof of payment uploaded.
                </div>
                <a
                    href={existingProof}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-w-xs"
                >
                    <img src={existingProof} alt="Uploaded receipt" className="w-full object-contain bg-white" />
                </a>
                <p className="text-xs text-gray-500">
                    Your receipt is being verified. We'll update the order status shortly.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Upload a single clear image of your payment proof.
            </p>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative">
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                />
                {file ? (
                    <div className="text-blue-600 dark:text-blue-400 font-medium text-sm">{file.name}</div>
                ) : (
                    <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                        <Upload className="w-8 h-8 mb-2" />
                        <p className="text-sm">Click to select receipt image</p>
                        <p className="text-xs mt-1">JPG, PNG up to 5MB</p>
                    </div>
                )}
            </div>
            {file && (
                <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                    {isUploading ? 'Uploading...' : 'Confirm Upload'}
                </button>
            )}
        </div>
    );
}

function InstallmentUpload({
    orderId,
    installments,
    onComplete,
}: {
    orderId: string;
    installments: InstallmentRef[];
    onComplete: () => void;
}) {
    const unpaidHint =
        installments.length === 0
            ? 'No installments recorded yet. The shop will add each installment as you pay.'
            : null;

    return (
        <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300">
                Installment orders require a separate proof image for <strong>each</strong> payment you make.
                Upload a receipt below for every installment.
            </div>

            {unpaidHint && (
                <div className="text-sm text-gray-500 dark:text-gray-400 italic">{unpaidHint}</div>
            )}

            <div className="space-y-3">
                {installments.map((inst, idx) => (
                    <InstallmentRow
                        key={inst.id}
                        index={idx + 1}
                        installment={inst}
                        orderId={orderId}
                        onComplete={onComplete}
                    />
                ))}
            </div>
        </div>
    );
}

function InstallmentRow({
    index,
    installment,
    orderId,
    onComplete,
}: {
    index: number;
    installment: InstallmentRef;
    orderId: string;
    onComplete: () => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        try {
            await postUpload({ orderId, installmentId: installment.id, file });
            toast.success(`Receipt uploaded for installment #${index}`);
            setFile(null);
            onComplete();
        } catch (err: any) {
            toast.error(err.message || 'Failed to upload');
        } finally {
            setIsUploading(false);
        }
    };

    const date = new Date(installment.createdAt).toLocaleDateString('en-NG', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                        Installment #{index} · {formatCurrency(installment.amount)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Logged {date}</div>
                </div>
                {installment.proofOfPayment ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                        <Check className="w-3 h-3" /> Uploaded
                    </span>
                ) : (
                    <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full">
                        Awaiting proof
                    </span>
                )}
            </div>

            {installment.proofOfPayment ? (
                <a
                    href={installment.proofOfPayment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                    <ImageIcon className="w-4 h-4" /> View uploaded receipt
                </a>
            ) : (
                <>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center relative hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={isUploading}
                        />
                        {file ? (
                            <div className="text-blue-600 dark:text-blue-400 font-medium text-sm">{file.name}</div>
                        ) : (
                            <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                                <Upload className="w-6 h-6 mb-1" />
                                <p className="text-xs">Select receipt image</p>
                            </div>
                        )}
                    </div>
                    {file && (
                        <button
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                            {isUploading ? 'Uploading...' : `Upload for installment #${index}`}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
