import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DemoPanel from '../components/DemoPanel';
export default function DemoScreen() {
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F5' }}><ScrollView><DemoPanel /></ScrollView></SafeAreaView>;
}
