// Marges de sécurité à zéro pour Jest : le mock fourni par la bibliothèque, sans SafeAreaProvider.
module.exports = require('react-native-safe-area-context/jest/mock').default;
