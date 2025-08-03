Request URL
http://localhost:3000/api/gemini/analyze-payment

{
    "success": true,
    "message": "银行付款凭证分析完成",
    "data": {
        "analysis": {
            "success": true,
            "payment_status": "success",
            "bank_name": "BCA",
            "transaction_type": "Payment",
            "amount": 752000,
            "currency": "IDR",
            "transaction_id": "000915",
            "transaction_date": "2025-07-01",
            "transaction_time": "16:34:00",
            "payer_info": "************3825",
            "payee_info": "000885002644618",
            "payee_name": "XSPACE PIK",
            "reference_number": "163422",
            "notes": "SIGNATURE NOT REQUIRED. Merchant Copy.",
            "confidence_score": 98,
            "extracted_text": "BCA\nXSPACE PIK\nGOLF ISLAND RG II\nPIK NO 18\n\nTERM# D2DR2173 MERCH# 000885002644618\nCARD TYPE DEBIT MC BCA (DIP)\n************3825\n\nSALE DATE/TIME 01 JUL,25 16:34\nBATCH : 000181 TRACE NO: 001112\nREF.NO. 000915 APPR.CODE 163422\nTOTAL Rp.752,000\n\nAID : A0000006021010 TVR : 0000048000\nTC : E62D687FF02226BA TSI : F800\nAP/AL : NSICCS\n\n*** SIGNATURE NOT REQUIRED ***\n\n**Merchant Copy**\n\n73AC562433/ANS031VB",
            "processed_at": "2025-08-03T08:01:43.594Z",
            "model_used": "gemini-2.5-pro",
            "image_size": 1724499,
            "mime_type": "image/png"
        },
        "validation": {
            "isValid": true,
            "missing_fields": [],
            "warnings": []
        },
        "file_info": {
            "original_name": "image (1).png",
            "size": 1724499,
            "type": "image/png"
        }
    },
    "timestamp": "2025-08-03T08:01:43.594Z"
}