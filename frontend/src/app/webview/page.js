"use client"

import { Button, Input, message, Typography } from "antd";
import styles from "../page.module.css";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
const { TextArea } = Input;
import { CheckCircleTwoTone, LoadingOutlined } from '@ant-design/icons';
import { useParams, useSearchParams } from "next/navigation";

export default function Home() {
    const [value, setValue] = useState('');
    const [clientHandle, setClientHandle] = useState('');
    const [buttonDisabled, setButtonDisabled] = useState(false);
    const [sessionId, setSessionId] = useState('');
    const [phone, setPhone] = useState('');
    const [step, setStep] = useState(0);
    const [otpId, setOtpId] = useState('');
    const [ivrInitDetails,setIvrInitDetails] = useState({});

    let params = useSearchParams();

    const progressSteps = [
        'User Login',
        'OTP Verification',
        'Trigger IVR Call',
        'Fetching Linked Accounts',
        'Consent Review',
        'Consent Approval',

    ];

    useEffect(() => {
        let fi = params.get('fi');
        let ecreq = params.get('ecreq');
        let reqdate = params.get('reqdate');
        let client_handle = params.get('client_handle');
        console.log(client_handle)
        setClientHandle(client_handle);
        let token = "ecreq=" + ecreq + "&fi=" + fi + "&reqdate=" + reqdate;
        handleDecode(token, client_handle)

    }, [])
    
    const handleLogin = async (phone,sessionId) => {
        let data = JSON.stringify({
            "phoneNumber": phone,
            "isTermsAndConditionAgreed": true
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${process.env.NEXT_PUBLIC_AA_ADAPTER_URL}/User/init-otp`,
            headers: {
                'session_id': sessionId,
                'Content-Type': 'application/json'
            },
            data
        };

        axios.request(config)
            .then((response) => {
                setOtpId(response.data.otpUniqueID);

            })
            .catch((error) => {
                console.log(error);

            });

    }

    const handleSubmitOTP = 
      (otp) => {

        let data = JSON.stringify({
            "phoneNumber": phone,
            "otp": otp,
            "otpUniqueID": otpId
          });
          
          let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${process.env.NEXT_PUBLIC_AA_ADAPTER_URL}/User/verify-otp`,
            headers: { 
              'session_id': sessionId, 
              'Content-Type': 'application/json'
            },
            data : data
          };
          
          axios.request(config)
          .then((response) => {
            setIvrInitDetails({...response.data,sessionId,phone,clientHandle})
            console.log({...response.data,sessionId,phone,clientHandle});

          })
          .catch((error) => {
            console.log(error);
          });
      }

    useEffect(()=>{
        console.log(otpId);

    },[otpId])
    

    const handleDecode = async (token, client) => {
        let url = process.env.NEXT_PUBLIC_AA_ADAPTER_URL;
        //replace all %3D to =
        token = token.replace(/%3D/g, "=");
        console.log({ token, url, client });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${url}/webview?${token}`,
            headers: {
                'client_handle': client
            }
        };


        let res = await axios.request(config)
        if (res.status === 200) {
            console.log("Session started")
            let data = res.data;
            let { sessionId, phone, fiuName } = data;
            setSessionId(sessionId);
            setPhone(phone);
            await handleLogin(phone,sessionId);

        }
        else {
            message.info("Expired Request")
        }

    }

    const getProgress = async () => {
        console.log("fetching request");
        let url = process.env.NEXT_PUBLIC_AA_ADAPTER_URL;
        let config = {
            method: 'get',
            url: `${url}/progress?sessionId=${sessionId}`,
        };

        let res = await axios.request(config)
        if (res.status === 200) {
            setStep(res.data.step);

        }
        else {
            message.error("Failed to fetch progress")
        }
    }

    const triggerIVR = async() => {
        await axios.post(`${process.env.NEXT_PUBLIC_AA_ADAPTER_URL}/progress`,{
            sessionId: sessionId,
            progress: 3,

        })

    }

    useEffect(() => {
        if (sessionId.length === 0) {
            return;
        }
        let interval = setInterval(() => {
            getProgress();

            return () => {
                clearInterval(interval);
            }

        }, 2000)

    }, [sessionId]);

    return (
        <div className={styles.page}>
            {
                sessionId.length > 0 &&
                <div>
                    <h2>Session ID : {sessionId}</h2>
                    <p>Phone: {phone}</p>

                </div>
            }


            <Button disabled={step !== 2} type="primary" onClick={triggerIVR}>Trigger IVR Call</Button>

            {
                step === 1 && 
                <div>
                    <Typography.Title level={5}>Enter your OTP</Typography.Title>
                    <Input.OTP length={4} onChange={(e)=>handleSubmitOTP(e,otpId)}/>

                </div>
            }

            {
                sessionId.length > 0 &&
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "flex-start", gap: "10px" }}>
                    {
                        progressSteps.map((item, index) => {
                            return (
                                <div key={index} style={{ display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: "10px" }}>
                                    <span>{item}</span>
                                    {
                                        step >= index ? step === index ? <LoadingOutlined /> : <CheckCircleTwoTone twoToneColor="#52c41a" /> : <></>
                                    }

                                </div>
                            );
                        })
                    }
                </div>
            }

            {
                step === 6 &&
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-start", alignItems: "flex-start", gap: "10px" }}>
                    <span>Verification Complete</span>
                    {
                        <CheckCircleTwoTone twoToneColor="#52c41a" />
                    }

                </div>
            }
        </div>
    );
}
