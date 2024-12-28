'use client';

import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const btcSchema = z.object({
    input: z.string().min(1, { message: 'Input is required' }),
    isTxid: z.boolean(),
    isWalletAddress: z.boolean(),
});

type FormValues = z.infer<typeof btcSchema>;

export default function Dashboard() {
    const [isLoading, setIsLoading] = useState(false);
    const [forensicData, setForensicData] = useState(null);
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(btcSchema),
        defaultValues: {
            input: '',
            isTxid: false,
            isWalletAddress: false
        }
    });

    const onSubmit = async (values: FormValues) => {
        try {
            setIsLoading(true);
            const input = values.input;
            // Validate if it's a txid or wallet address
            const isTxid = /^[a-fA-F0-9]{64}$/.test(input);
            const isWalletAddress = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(input);

            if (!isTxid && !isWalletAddress) {
                toast({
                    title: "Invalid Input",
                    description: "Please enter a valid Bitcoin transaction ID or wallet address",
                    variant: "destructive",
                });
                return;
            }

            // Update the form values
            const updatedValues = {
                ...values,
                isTxid,
                isWalletAddress
            };

            console.log('Form submitted:', updatedValues);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Values to test:
    // 171056d23f13fe5ee896006495abfcd6670ccb58e5371e2b89c894ff6fea4038
    // 37jKPSmbEGwgfacCr2nayn1wTaqMAbA94Z
    return (
        <div className="flex justify-center items-center min-h-screen p-4">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 w-full max-w-md">
                    <FormField
                        control={form.control}
                        name="input"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Enter Transaction ID or Wallet Address</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Enter txid or wallet address" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Processing...' : 'Submit'}
                    </Button>
                </form>
            </Form>
        </div>
    );
}

